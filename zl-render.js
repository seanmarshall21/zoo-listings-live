/**
 * zl-render.js
 * v0.4.0 — REAL production classes (no namespace); relies on site-wide #3866/#3867.
 * v0.3.0
 * 2026-08-03
 *
 * v0.4.0 — REAL production classes (no namespace); relies on site-wide #3866/#3867.
 * v0.3.0 — Renderer rewritten to emit the EXACT current production card DOM
 *          (extracted live from /partnerships/): single .emh_listings_repeater_view
 *          wrapper, .emh_listings_tag_cont > .emh_listings_chip_tag chips,
 *          .emh_listings_meta_eyebrow + .emh_listings_meta_data groups,
 *          .emh_listings_genre_cont > .emh_listings_chip_tag_large, and the full
 *          .emh_listings_footer (EST/Loc/Yrs + Instagram/Website + CONTACT cta).
 *          The prior version used stale class names from layer-stack-v2, so the CSS
 *          couldn't match it. This makes the namespaced production CSS fully apply.
 * v0.2.0 — REAL IN-PAGE ELEMENTS (no iframe). Namespaced classes (zl_*).
 * v0.1.x — earlier iframe-era versions.
 *
 * Zoo Agency — Live Sandbox renderer. Runs in the host page BEFORE zl-listings.js.
 * Reads window.ZOO_LIVE_DATA and builds real, namespaced (zl_*) elements into
 * #zoo-live, then the engine wires filters / view toggle / search / hover video.
 *
 * (Do NOT write the shortcode in [brackets] anywhere in this file.)
 */
(function () {
  'use strict';

  var DATA = Array.isArray(window.ZOO_LIVE_DATA) ? window.ZOO_LIVE_DATA : [];

  function el(tag, cls, attrs, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function txt(s) { return document.createTextNode(String(s == null ? '' : s)); }

  // ── date block (month / day range / year), or TBD ───────────────────────────
  function dateBlock(d) {
    d = d || {};
    var wrap = el('div', 'emh_listings_cont_date');
    if (d.tbd) {
      wrap.appendChild(el('div', 'emh_listings_date_month', null, esc(d.tbdText || 'TBD')));
      if (d.year) wrap.appendChild(el('div', 'emh_listings_date_year', null, esc(d.year)));
      return wrap;
    }
    if (d.month) wrap.appendChild(el('div', 'emh_listings_date_month', null, esc(d.month)));
    if (d.day != null && d.day !== '') wrap.appendChild(el('div', 'emh_listings_date_day', null, esc(d.day)));
    if (d.year) wrap.appendChild(el('div', 'emh_listings_date_year', null, esc(d.year)));
    return wrap;
  }

  // ── tag chips → .cont_tags > .tag_cont > .chip_tag ──────────────────────────
  function tagRow(tags) {
    var cont = el('div', 'emh_listings_cont_tags');
    var box = el('div', 'emh_listings_tag_cont');
    (tags || []).forEach(function (t) {
      box.appendChild(el('span', 'emh_listings_chip_tag', null, esc(t)));
    });
    cont.appendChild(box);
    return cont;
  }

  // ── one meta group: eyebrow "[ Label ]" + data ──────────────────────────────
  function metaGrp(label, dataNode, extraDataCls) {
    var grp = el('div', 'emh_listings_meta_grp');
    var eb = el('div', 'emh_listings_meta_eyebrow');
    eb.appendChild(el('div', null, null, '[ ' + esc(label) + ' ]'));
    grp.appendChild(eb);
    var data = el('div', 'emh_listings_meta_data' + (extraDataCls ? ' ' + extraDataCls : ''));
    data.appendChild(dataNode instanceof Node ? dataNode : txt(dataNode));
    grp.appendChild(data);
    return grp;
  }

  function genreChips(item) {
    if (item.customText) return txt(item.customText);
    var box = el('div', 'emh_listings_genre_cont');
    (item.genres || []).forEach(function (g) {
      box.appendChild(el('span', 'emh_listings_chip_tag_large', null, esc(g)));
    });
    return box;
  }

  function metaGrid(item) {
    var meta = el('div', 'emh_listings_cont_meta');
    if (item.location)      meta.appendChild(metaGrp('Location', txt(item.location)));
    if (item.capacityValue) meta.appendChild(metaGrp(item.capacityLabel || 'Capacity', txt(item.capacityValue)));
    if (item.venue)         meta.appendChild(metaGrp('Venue', txt(item.venue)));
    meta.appendChild(metaGrp(item.genreLabel || 'Genre', genreChips(item), 'emh_listings_genre_cont'));
    return meta;
  }

  // ── image + lazy hover video ─────────────────────────────────────────────────
  function imageBox(item) {
    var box = el('div', 'emh_listings_cont_image');
    if (item.image) box.appendChild(el('img', null, { src: item.image, alt: item.title || '', loading: 'lazy' }));
    if (item.vimeoId) {
      var wrap = el('div', 'emh_listings_video_wrap');
      var src = 'https://player.vimeo.com/video/' + encodeURIComponent(item.vimeoId) +
                '?background=1&autoplay=1&muted=1&loop=1&autopause=0';
      wrap.appendChild(el('iframe', null, {
        'data-src': src, frameborder: '0', allow: 'autoplay', tabindex: '-1', 'aria-hidden': 'true'
      }));
      box.appendChild(wrap);
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
    t.appendChild(el('h1', 'emh_listings_title', null, esc(item.title)));
    if (item.season) t.appendChild(el('span', 'emh_listings_season', null, esc(item.season)));
    return t;
  }

  // ── footer: EST / Loc / Yrs + Instagram / Website + CONTACT ──────────────────
  function footer(item) {
    var f = el('div', 'emh_listings_footer');
    var data = el('div', 'emh_listings_footer_data');

    var estab = el('div', 'emh_listings_data_estab_cont');
    if (item.established) estab.appendChild(el('div', 'emh_listings_text_estab', null, esc(item.established)));
    var col = el('div', 'emh_listings_data_col');
    function infoRow(label, value) {
      var row = el('div', 'emh_listings_data_info_row');
      row.appendChild(el('div', 'emh_listings_data_label', null, esc(label)));
      row.appendChild(el('div', 'emh_listings_data_value', null, esc(value)));
      return row;
    }
    if (item.location) col.appendChild(infoRow('Loc', item.location));
    if (item.nthYear)  col.appendChild(infoRow('Yrs', item.nthYear));
    estab.appendChild(col);
    data.appendChild(estab);

    var links = el('div', 'emh_listings_data_links_row');
    function footLink(label, href) {
      var cont = el('div', 'emh_listings_foot_link_cont');
      cont.appendChild(el('a', 'emh_listings_foot_link', { href: href, target: '_blank', rel: 'noopener' }, esc(label)));
      return cont;
    }
    if (item.instagram) links.appendChild(footLink('Instagram', item.instagram));
    if (item.website)   links.appendChild(footLink('Website', item.website));
    data.appendChild(links);
    f.appendChild(data);

    var ctaCont = el('div', 'emh_listings_cta_cont');
    var cta = el('a', 'emh_listings_footer_cta', { href: item.contactHref || '#' });
    cta.appendChild(el('div', 'emh_listings_cta_inner', null, 'CONTACT'));
    ctaCont.appendChild(cta);
    f.appendChild(ctaCont);
    return f;
  }

  // ── one card = .emh_listings_parent (single .repeater_view) ───────────────
  function card(item) {
    var parent = el('div', 'emh_listings_parent', {
      'data-brand':      item.brand || '',
      'data-venue':      item.venue || '',
      'data-year':       item.year || '',
      'data-is-past':    item.isPast || '0',
      'data-start-date': item.startDate || ''
    });
    var view = el('div', 'emh_listings_repeater_view');
    view.appendChild(imageBox(item));

    var inner = el('div', 'emh_listings_inner');
    var head = el('div', 'emh_listings_head');
    head.appendChild(dateBlock(item.date));
    head.appendChild(logoBox(item));
    inner.appendChild(head);

    var content = el('div', 'emh_listings_content');
    var main = el('div', 'emh_listings_cont_main');
    main.appendChild(titleBlock(item));
    if (item.tags && item.tags.length) main.appendChild(tagRow(item.tags));
    content.appendChild(main);
    content.appendChild(metaGrid(item));
    inner.appendChild(content);

    inner.appendChild(footer(item));
    view.appendChild(inner);
    parent.appendChild(view);
    return parent;
  }

  // ── ZFC filter bar ───────────────────────────────────────────────────────────
  function filterGroup(key, label, isPast) {
    var g = el('div', 'zfc_group' + (isPast ? ' zfc_group--past' : ''), { 'data-zfc-filter': key });
    g.appendChild(el('span', 'zfc_group_label', null, esc(label)));
    var chips = el('div', 'zfc_chips');
    if (isPast) chips.appendChild(el('button', 'zfc_chip', { type: 'button', 'aria-pressed': 'false' }, 'Past Events'));
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
    var field = el('div', 'emh_search_field_wrapper');
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
    frag.appendChild(el('div', 'emh_cntrl_nav_btn emh_cntrl_togl_grid', { role: 'button', 'aria-label': 'Grid view', title: 'Grid view' },
      '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>'));
    frag.appendChild(el('div', 'emh_cntrl_nav_btn emh_cntrl_togl_list', { role: 'button', 'aria-label': 'List view', title: 'List view' },
      '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="1" y="2" width="14" height="2.4" rx="1"/><rect x="1" y="7" width="14" height="2.4" rx="1"/><rect x="1" y="12" width="14" height="2.4" rx="1"/></svg>'));
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

  // ── mount ─────────────────────────────────────────────────────────────────────
  // Production CSS pre-hides .emh_listings_parent (opacity:0) and reveals via the
  // GSAP entrance. Scoped to #zoo-live so we never touch production /partnerships/,
  // force our sandbox cards + controls visible regardless of the animation.
  function injectRevealStyle() {
    if (document.getElementById('zoo-live-reveal')) return;
    var st = document.createElement('style');
    st.id = 'zoo-live-reveal';
    st.textContent =
      '#zoo-live .emh_listings_parent,#zoo-live .zfc_group,#zoo-live .zfc_bar_actions > *,#zoo-live [data-vc-anim]' +
      '{opacity:1 !important;visibility:visible !important;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function render() {
    injectRevealStyle();
    var root = document.getElementById('zoo-live') || document.body;
    root.innerHTML = '';
    if (!DATA.length) {
      root.appendChild(el('div', 'zoo-live-empty', null,
        'No published event properties found (or none passed to the shortcode).'));
      return;
    }
    root.appendChild(buildBar());
    var repeater = el('div', 'emh_listings_repeater grid-view');
    DATA.forEach(function (item) { repeater.appendChild(card(item)); });
    root.appendChild(repeater);
    window.ZOO_LIVE_RENDERED = true;
  }

  // Safety net: the CSS pre-hides cards/controls and reveals them via the GSAP
  // entrance. If the ticker stalls the page would stay blank — force visible.
  function revealSafety() {
    var sel = '.emh_listings_parent, .zfc_group, .zfc_bar_actions > *, [data-vc-anim]';
    if (window.gsap && gsap.killTweensOf) { try { gsap.killTweensOf(sel); } catch (e) {} }
    document.querySelectorAll(sel).forEach(function (node) {
      if (getComputedStyle(node).display === 'none') return;
      node.style.opacity = '1';
      node.style.visibility = 'visible';
      node.style.transform = 'none';
      node.style.scale = 'none';
    });
  }

  render();
  setTimeout(revealSafety, 1600);
})();
