/**
 * zl-render.js
 * v0.5.6
 * 2026-08-04
 *
 * Zoo Agency — Live Sandbox renderer (Page B). Runs in the host page and builds
 * REAL production-class markup into #zoo-live from window.ZOO_LIVE_DATA, so the
 * site-wide production CSS (#3867 + Oxygen) and controller (#3866) style + wire it.
 * The running version is exposed at runtime: data-zl-render-version on #zoo-live
 * and a console.info line — so the live version can be verified, not just claimed.
 *
 * Changelog:
 * v0.5.6 — 2026-08-04 — FIX blank page: after building the cards, call the production
 *                        controller's window.emhListings_refresh() (retried until it
 *                        exists) so the site-wide #3866 engine adopts our injected
 *                        cards — runs the entrance (was leaving them at the CSS
 *                        opacity:0 pre-animation state) AND wires filtering/search/
 *                        toggles natively. Reveal-safety kept as a final fallback.
 * v0.5.5 — 2026-08-03 — Grid/list layout: stop overriding production card internals;
 *                        just set the repeater as a flex-wrap container + neutralise
 *                        Isotope so production's own 3-col grid, breakpoints, footer
 *                        pinning and list layout apply. Restored the view toggles.
 * v0.5.4 — 2026-08-03 — Responsive TILE GRID always (auto-fill, cards size to content,
 *                        never crop); neutralises Isotope absolute layout + list view;
 *                        view-toggle buttons hidden.
 * v0.5.3 — 2026-08-03 — Control icon sizes scoped down (search was 55px); EST year
 *                        formatted as "[ EST.YYYY ]" in the footer. (EST/YRS now
 *                        populate once the PHP reads vc_em_estd — snippet v0.3.1.)
 * v0.5.2 — 2026-08-03 — Image layout: reinforce cover (fixed box, object-fit:cover,
 *                        center) + neutral fill for empty (no-photo) containers.
 * v0.5.1 — 2026-08-03 — Brand logo rendered as inline SVG (item.logoSvg) themed via
 *                        currentColor, instead of <img>.
 * v0.5.0 — 2026-08-03 — Fix filter overlap (removed !important reveal that kept
 *                        filtered-out cards visible); wrap in .emh_listings_container
 *                        (max-width) + top padding; real dropdown filter labels
 *                        (.zfc_drpdwn chevron + hover underline); reveal is now a
 *                        strict last-resort only when every card is invisible.
 * v0.4.0 — REAL production classes (no namespace); relies on site-wide #3866/#3867.
 * v0.3.0 — Rewritten to emit the exact production card DOM (extracted live).
 * v0.2.0 — Real in-page elements (no iframe); namespaced classes (superseded by v0.4).
 * v0.1.x — earlier iframe-era versions.
 *
 * (Do NOT write the shortcode in [brackets] anywhere in this file.)
 */
(function () {
  'use strict';

  var ZL_RENDER_VERSION = '0.5.6';
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
    if (item.logoSvg) {
      // Inline SVG (like production) so it's themed via currentColor.
      var inner = el('div', 'emh_listings_item_logo');
      inner.innerHTML = item.logoSvg;
      box.appendChild(inner);
    } else if (item.logo) {
      box.appendChild(el('img', null, { src: item.logo, alt: item.brand || '' }));
    }
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
    if (item.established) estab.appendChild(el('div', 'emh_listings_text_estab', null, '[ EST.' + esc(item.established) + ' ]'));
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
  // Mirrors production drawer structure: label = .zfc_group_label.vc-hover-text-underline
  // containing a <span>, a .zfc_drpdwn chevron, and the hover underline line; the
  // engine (#3866 initZFCDrawer) turns the label into an accordion toggle.
  function filterGroup(key, label, isPast) {
    var g = el('div', 'zfc_group' + (isPast ? ' zfc_group--past' : ''), { 'data-zfc-filter': key });
    if (isPast) {
      // Past is an inline toggle chip (with the animated check), no dropdown label.
      var chipsP = el('div', 'zfc_chips');
      var btn = el('button', 'zfc_chip', { type: 'button', 'aria-pressed': 'false' });
      btn.appendChild(el('span', 'zfc_chip__check', null,
        '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.2l2.6 2.6L10 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
      btn.appendChild(txt('Past Events'));
      chipsP.appendChild(btn);
      g.appendChild(chipsP);
      return g;
    }
    var lbl = el('div', 'zfc_group_label vc-hover-text-underline');
    lbl.appendChild(el('span', null, null, esc(label)));
    lbl.appendChild(el('div', 'zfc_drpdwn', null,
      '<svg viewBox="0 0 10 6" aria-hidden="true"><path d="M0 0l5 6 5-6z"/></svg>'));
    lbl.appendChild(el('span', 'vc-hover-text-underline__line'));
    g.appendChild(lbl);
    g.appendChild(el('div', 'zfc_chips')); // chips filled by the engine's buildZFCOptions()
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
  // Host layout only — NO opacity/visibility force here (that would keep
  // filtered-out cards visible and break Isotope's layout). Adds the page's
  // container max-width + breathing room at the top, scoped to #zoo-live.
  function injectHostStyle() {
    if (document.getElementById('zoo-live-host-style')) return;
    var st = document.createElement('style');
    st.id = 'zoo-live-host-style';
    st.textContent =
      '#zoo-live{display:block;box-sizing:border-box;padding:48px 24px 80px;}' +
      '#zoo-live .emh_listings_container{max-width:var(--emh-max-width,1400px);margin:0 auto;}' +
      // Theme the inline brand-logo SVG (paths often have no fill → inherit currentColor).
      '#zoo-live .emh_listings_item_logo svg,#zoo-live .emh_listings_item_logo svg path{fill:currentColor;}' +
      '#zoo-live .emh_listings_item_logo svg{max-height:32px;width:auto;height:auto;display:block;}' +
      // Image layout: fixed-size box, cover regardless of the upload aspect ratio,
      // centered, overflow cropped. A neutral fill covers containers with no photo yet.
      '#zoo-live .emh_listings_cont_image{overflow:hidden;position:relative;' +
        'background:color-mix(in srgb,var(--zoo-text,#888) 7%,transparent);}' +
      '#zoo-live .emh_listings_cont_image img{position:absolute;inset:0;width:100%;height:100%;' +
        'object-fit:cover;object-position:center center;display:block;}' +
      // Control icons: production sizes some to 55px/20px (built for sprite <use>);
      // our inline SVGs need sane sizes. Scoped so /partnerships/ is untouched.
      '#zoo-live .emh_search_toggle_icon svg{width:18px;height:18px;}' +
      '#zoo-live .emh_search_clear_icon svg{width:11px;height:11px;}' +
      '#zoo-live .emh_cntrl_togl_grid svg,#zoo-live .emh_cntrl_togl_list svg{width:16px;height:16px;}' +
      // ── Layout ───────────────────────────
      // Our cards are DIRECT children of .emh_listings_repeater (production nests
      // them in Oxygen's .oxy-posts), so we only: make the repeater a flex-wrap
      // container and neutralise Isotope's absolute positioning so cards flow.
      // Everything else — 3-col grid (cards are 32% wide), 3→2→1 breakpoints, meta
      // margin-top:auto pinning the footer to the bottom, list layout — is
      // production's own CSS, so grid AND list match /partnerships/.
      '#zoo-live .emh_listings_repeater{display:flex !important;flex-flow:row wrap !important;gap:var(--emh-card-gap,20px) !important;align-content:flex-start !important;height:auto !important;}' +
      '#zoo-live .emh_listings_parent{position:relative !important;left:auto !important;top:auto !important;right:auto !important;bottom:auto !important;transform:none !important;margin:0 !important;}' +
      '#zoo-live .zoo-live-empty{padding:40px;font-family:acumin-pro,sans-serif;color:var(--zoo-mid);text-align:center;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function render() {
    injectHostStyle();
    var root = document.getElementById('zoo-live') || document.body;
    root.setAttribute('data-zl-render-version', ZL_RENDER_VERSION);
    try { console.info('[zoo-live] renderer v' + ZL_RENDER_VERSION); } catch (e) {}
    root.innerHTML = '';
    if (!DATA.length) {
      root.appendChild(el('div', 'zoo-live-empty', null,
        'No published event properties found (or none passed to the shortcode).'));
      return;
    }
    // Wrap in the production container (max-width, centered) — fixes full-bleed list.
    var container = el('div', 'emh_listings_container');
    container.appendChild(buildBar());
    var repeater = el('div', 'emh_listings_repeater grid-view');
    DATA.forEach(function (item) { repeater.appendChild(card(item)); });
    container.appendChild(repeater);
    root.appendChild(container);
    window.ZOO_LIVE_RENDERED = true;
  }

  // Last-resort reveal ONLY when the entrance animation totally failed to run
  // (e.g. GSAP never loaded) — i.e. every card is still invisible. During normal
  // operation (some cards shown, others filtered out) this is a strict no-op, so
  // it never fights the filter.
  function revealSafetyIfTotallyBlank() {
    var cards = document.querySelectorAll('#zoo-live .emh_listings_parent');
    if (!cards.length) return;
    var anyVisible = false;
    cards.forEach(function (c) {
      var cs = getComputedStyle(c);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02) anyVisible = true;
    });
    if (anyVisible) return; // entrance worked and/or filtering is active — leave it alone
    if (window.gsap && gsap.killTweensOf) { try { gsap.killTweensOf('#zoo-live .emh_listings_parent'); } catch (e) {} }
    cards.forEach(function (c) { c.style.opacity = '1'; c.style.visibility = 'visible'; c.style.transform = 'none'; });
  }

  // Hand our freshly-injected cards to the site-wide production controller (#3866).
  // Its init runs on DOMContentLoaded, BEFORE our async GitHub fetch resolves, so it
  // never sees our cards on its own — they stay stuck at the CSS entrance state
  // (.emh_listings_repeater:not(.isotope-active) .emh_listings_parent{opacity:0}).
  // Calling emhListings_refresh() makes it re-scan the DOM: it runs the entrance
  // animation AND wires filtering / search / grid-list toggles on our cards natively.
  // Retried a few times because the controller script may still be loading.
  function activateProductionEngine(attempt) {
    attempt = attempt || 0;
    if (typeof window.emhListings_refresh === 'function') {
      try { window.emhListings_refresh(); } catch (e) {}
      // One more pass on the next frame — some builds need a second nudge after
      // Isotope/GSAP have initialised on the new nodes.
      try { requestAnimationFrame(function () { try { window.emhListings_refresh(); } catch (e) {} }); } catch (e) {}
      return;
    }
    if (attempt < 12) setTimeout(function () { activateProductionEngine(attempt + 1); }, 250);
  }

  render();
  activateProductionEngine();
  // Final fallback: if the controller never showed up (e.g. #3866 not on this page),
  // guarantee the cards aren't left invisible.
  setTimeout(revealSafetyIfTotallyBlank, 3000);
})();
