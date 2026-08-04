/**
 * zoo-live-render.js
 * v0.1.1
 * 2026-08-03
 *
 * v0.1.1 — revealSafety() fallback: force-reveal cards/controls if the GSAP
 *          entrance animation doesn't complete (throttled rAF / offscreen iframe /
 *          GSAP load failure), so the sandbox never renders blank.
 *
 * Zoo Agency — Live Sandbox renderer.
 *
 * Runs INSIDE the sandbox iframe (Page B), BEFORE vc-listings.js (the engine).
 * Reads window.ZOO_LIVE_DATA (a plain array of listing objects injected by the
 * WordPress [zoo_listings_live] shortcode) and builds the exact DOM contract the
 * production engine expects:
 *
 *   .zfc_bar_wrap  → .zfc_bar_fltr_wrap → .zfc_wrap → .zfc_group[data-zfc-filter]
 *                    .zfc_bar_actions   → search widget + grid/list toggles
 *   .emh_listings_repeater → .emh_listings_parent[data-brand|venue|year|is-past|start-date]
 *                    → tile view + list view (mirrors Oxygen post 815 layer stack)
 *
 * Because we set the data-* attributes and inject tag/genre chips directly from
 * the JSON at render time, this file REPLACES both the Oxygen repeater markup
 * AND WPCode #3589 (emh-listings-data-attrs.php) for the sandbox surface.
 *
 * After the DOM is built, vc-listings.js is injected; its init() wires up
 * filters, view toggle, search, hover video, and (if present) GSAP/Isotope.
 * The shortcode bootstrap then calls emhListings_refresh() once for entrance
 * animations.
 *
 * Also reports content height to the parent window via postMessage so the host
 * page can size the iframe to fit (no inner scrollbar).
 */
(function () {
  'use strict';

  var DATA = Array.isArray(window.ZOO_LIVE_DATA) ? window.ZOO_LIVE_DATA : [];

  // ── tiny DOM helper ─────────────────────────────────────────────────────────
  function el(tag, cls, attrs, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── date block (month / day range / year), or TBD ───────────────────────────
  function dateBlock(d) {
    d = d || {};
    var wrap = el('div', 'emh_listings_cont_date');
    if (d.tbd) {
      wrap.appendChild(el('div', 'emh_listings_date_tbd', null, esc(d.tbdText || 'TBD')));
      if (d.year) wrap.appendChild(el('span', 'emh_listings_date_year', null, esc(d.year)));
      return wrap;
    }
    if (d.month) wrap.appendChild(el('span', 'emh_listings_date_month', null, esc(d.month)));
    if (d.day != null) wrap.appendChild(el('div', 'emh_listings_date_day', null, esc(d.day)));
    if (d.year) wrap.appendChild(el('span', 'emh_listings_date_year', null, esc(d.year)));
    return wrap;
  }

  // ── tag chips → .emh_listings_cont_tags > .vc_listings_row_tag ──────────────
  function tagRow(tags) {
    var box = el('div', 'emh_listings_cont_tags');
    (tags || []).forEach(function (t) {
      box.appendChild(el('div', 'vc_listings_row_tag', null, '<span>' + esc(t) + '</span>'));
    });
    return box;
  }

  // ── one meta cell (label + value) ────────────────────────────────────────────
  function metaCell(label, value, extraCls) {
    var cell = el('div', 'emh_listings_meta_grp' + (extraCls ? ' ' + extraCls : ''));
    cell.appendChild(el('span', 'emh_listings_meta_label', null, esc(label)));
    if (value instanceof Node) {
      var v = el('div', 'emh_listings_meta_value');
      v.appendChild(value);
      cell.appendChild(v);
    } else {
      cell.appendChild(el('span', 'emh_listings_meta_value', null, esc(value)));
    }
    return cell;
  }

  // ── genre value: chips or custom text ────────────────────────────────────────
  function genreValue(item) {
    if (item.customText) return document.createTextNode(item.customText);
    var box = el('div', 'emh_listings_cont_tags');
    (item.genres || []).forEach(function (g) {
      box.appendChild(el('div', 'vc_listings_chip_tag_large', null, '<span>' + esc(g) + '</span>'));
    });
    return box;
  }

  // ── meta grid (shared by tile + list) ────────────────────────────────────────
  function metaGrid(item) {
    var meta = el('div', 'emh_listings_cont_meta');
    if (item.location)     meta.appendChild(metaCell('Location', item.location));
    if (item.capacityValue) meta.appendChild(metaCell(item.capacityLabel || 'Capacity', item.capacityValue));
    if (item.venue)        meta.appendChild(metaCell('Venue', item.venue));
    meta.appendChild(metaCell(item.genreLabel || 'Genre', genreValue(item), 'vc_listings_genre_cont'));
    if (item.customLabel && item.customText && (item.genreLabel || 'Genre') !== item.customLabel) {
      meta.appendChild(metaCell(item.customLabel, item.customText));
    }
    return meta;
  }

  // ── image container with lazy hover video ────────────────────────────────────
  function imageBox(item) {
    var box = el('div', 'emh_listings_cont_image');
    if (item.vimeoId) {
      var src = 'https://player.vimeo.com/video/' + encodeURIComponent(item.vimeoId) +
                '?background=1&autoplay=1&muted=1&loop=1&autopause=0';
      box.appendChild(el('iframe', 'emh_listings_video', {
        'data-src': src, frameborder: '0', allow: 'autoplay', tabindex: '-1', 'aria-hidden': 'true'
      }));
    }
    if (item.image) {
      box.appendChild(el('img', null, { src: item.image, alt: item.title || '', loading: 'lazy' }));
    }
    return box;
  }

  function logoBox(item) {
    var box = el('div', 'emh_listings_cont_logo');
    if (item.logo) box.appendChild(el('img', null, { src: item.logo, alt: item.brand || '' }));
    return box;
  }

  function titleBlock(item) {
    var t = el('div', 'emh_listings_cont_title');
    t.appendChild(el('h3', 'emh_listings_title', null, esc(item.title)));
    if (item.season) t.appendChild(el('span', 'emh_listings_season', null, esc(item.season)));
    return t;
  }

  // ── one card = .emh_listings_parent (tile view + list view) ──────────────────
  function card(item) {
    var parent = el('div', 'emh_listings_parent', {
      'data-brand':      item.brand || '',
      'data-venue':      item.venue || '',
      'data-year':       item.year || '',
      'data-is-past':    item.isPast || '0',
      'data-start-date': item.startDate || ''
    });

    // ── TILE VIEW ──
    var tile = el('div', 'vc_listings_repeater_view_tile');
    tile.appendChild(imageBox(item));
    var inner = el('div', 'emh_listings_inner');
    var headT = el('div', 'emh_listings_head');
    headT.appendChild(dateBlock(item.date));
    headT.appendChild(logoBox(item));
    inner.appendChild(headT);
    var contentT = el('div', 'emh_listings_content');
    var mainT = el('div', 'emh_listings_cont_main');
    mainT.appendChild(titleBlock(item));
    if (item.tags && item.tags.length) mainT.appendChild(tagRow(item.tags));
    mainT.appendChild(metaGrid(item));
    contentT.appendChild(mainT);
    inner.appendChild(contentT);
    tile.appendChild(inner);
    parent.appendChild(tile);

    // ── LIST VIEW ──
    var list = el('div', 'vc_listings_repeater_view_list');
    list.appendChild(imageBox(item));
    var headL = el('div', 'emh_listings_head');
    headL.appendChild(dateBlock(item.date));
    headL.appendChild(logoBox(item));
    list.appendChild(headL);
    var contentL = el('div', 'emh_listings_content');
    var mainL = el('div', 'emh_listings_cont_main');
    mainL.appendChild(titleBlock(item));
    if (item.tags && item.tags.length) mainL.appendChild(tagRow(item.tags));
    contentL.appendChild(mainL);
    contentL.appendChild(metaGrid(item));
    list.appendChild(contentL);
    parent.appendChild(list);

    return parent;
  }

  // ── ZFC filter bar ───────────────────────────────────────────────────────────
  // Groups are built empty; the engine's buildZFCOptions() fills the chips from
  // the cards' data-* attrs. The "past" group holds one static toggle chip.
  function filterGroup(key, label, isPast) {
    var g = el('div', 'zfc_group' + (isPast ? ' zfc_group--past' : ''), { 'data-zfc-filter': key });
    g.appendChild(el('span', 'zfc_group_label', null, esc(label)));
    var chips = el('div', 'zfc_chips');
    if (isPast) {
      var btn = el('button', 'zfc_chip', { type: 'button', 'aria-pressed': 'false' }, 'Past Events');
      chips.appendChild(btn);
    }
    g.appendChild(chips);
    return g;
  }

  function searchWidget() {
    var wrap = el('div', 'emh_search_wrapper');
    var toggle = el('div', 'emh_search_toggle', { role: 'button', 'aria-label': 'Search', tabindex: '0' });
    toggle.appendChild(el('span', 'emh_search_toggle_icon', null,
      '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'));
    wrap.appendChild(toggle);
    var expanded = el('div', 'emh_search_expanded');
    var field = el('div', 'emh_search_field');
    field.appendChild(el('input', null, { type: 'text', id: 'emh_search', placeholder: 'Search…', autocomplete: 'off' }));
    expanded.appendChild(field);
    var clear = el('div', 'emh_search_clear', { role: 'button', 'aria-label': 'Clear search' });
    clear.appendChild(el('span', 'emh_search_clear_icon', null,
      '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'));
    expanded.appendChild(clear);
    wrap.appendChild(expanded);
    return wrap;
  }

  function viewToggles() {
    var frag = document.createDocumentFragment();
    var grid = el('div', 'emh_cntrl_nav_btn emh_cntrl_togl_grid', { role: 'button', 'aria-label': 'Grid view', title: 'Grid view' },
      '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>');
    var list = el('div', 'emh_cntrl_nav_btn emh_cntrl_togl_list', { role: 'button', 'aria-label': 'List view', title: 'List view' },
      '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="1" y="2" width="14" height="2.4" rx="1"/><rect x="1" y="7" width="14" height="2.4" rx="1"/><rect x="1" y="12" width="14" height="2.4" rx="1"/></svg>');
    frag.appendChild(grid);
    frag.appendChild(list);
    return frag;
  }

  function buildBar() {
    var bar = el('div', 'zfc_bar_wrap');
    var fltrWrap = el('div', 'zfc_bar_fltr_wrap');
    var wrap = el('div', 'zfc_wrap');
    wrap.appendChild(filterGroup('brand', 'Brand'));
    wrap.appendChild(filterGroup('venue', 'Venue'));
    wrap.appendChild(filterGroup('year', 'Year'));
    wrap.appendChild(filterGroup('past', 'Past', true));
    fltrWrap.appendChild(wrap);
    bar.appendChild(fltrWrap);

    var actions = el('div', 'zfc_bar_actions');
    actions.appendChild(searchWidget());
    actions.appendChild(viewToggles());
    bar.appendChild(actions);
    return bar;
  }

  // ── mount everything ─────────────────────────────────────────────────────────
  function render() {
    var root = document.getElementById('zoo-live') || document.body;
    root.innerHTML = '';

    if (!DATA.length) {
      root.appendChild(el('div', 'zoo-live-empty', null,
        'No published event properties found (or none passed to the shortcode).'));
      reportHeight();
      return;
    }

    root.appendChild(buildBar());

    var repeater = el('div', 'emh_listings_repeater grid-view');
    DATA.forEach(function (item) { repeater.appendChild(card(item)); });
    root.appendChild(repeater);

    // Expose a hook the bootstrap can await if it wants to confirm render ran.
    window.ZOO_LIVE_RENDERED = true;
  }

  // ── iframe height reporting ──────────────────────────────────────────────────
  function reportHeight() {
    try {
      var h = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      );
      parent.postMessage({ type: 'zooLiveHeight', height: h }, '*');
    } catch (e) {}
  }

  // Safety net: production CSS pre-hides cards + controls (opacity:0/visibility:
  // hidden) and reveals them via the GSAP entrance animation. If that animation
  // never completes — throttled requestAnimationFrame in a background tab or an
  // offscreen iframe, or GSAP failing to load — the sandbox would render blank.
  // After a beat (long past the ~0.6s entrance), force-reveal anything still
  // hidden that isn't intentionally filtered out (display:none). When the
  // entrance DOES play, this is a harmless no-op.
  function revealSafety() {
    var sel = '.emh_listings_parent, .zfc_group, .zfc_bar_actions > *, [data-vc-anim]';
    // Kill any stuck entrance tweens so GSAP can't re-write opacity:0 on a later
    // tick (a partially-frozen ticker leaves the tween mid-flight). On a healthy
    // load the entrance is long done by now, so there is nothing to kill.
    if (window.gsap && gsap.killTweensOf) { try { gsap.killTweensOf(sel); } catch (e) {} }
    document.querySelectorAll(sel).forEach(function (el) {
      if (getComputedStyle(el).display === 'none') return; // keep filtered-out items hidden
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'none'; // clear a frozen scale(0.8) from a stalled tween
      el.style.scale = 'none';
    });
    reportHeight();
  }

  function watchHeight() {
    reportHeight();
    setTimeout(revealSafety, 1600);
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { reportHeight(); });
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    }
    // Fallback ticks: layout/anim settling, filter changes, font load.
    [120, 400, 900, 1800].forEach(function (t) { setTimeout(reportHeight, t); });
    window.addEventListener('resize', reportHeight);
    // Re-measure after any click (filter/view/search interactions change height).
    document.addEventListener('click', function () { setTimeout(reportHeight, 450); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reportHeight);
  }

  render();
  watchHeight();
})();
