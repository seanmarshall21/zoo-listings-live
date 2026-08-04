/**
 * v4.6.6
 * 2026-05-07 PDT
 *
 * vc-listings.js
 * Zoo Agency · EMH Event Property Listings Controller
 *
 * Changelog:
 * v4.6.6 — 2026-05-07 — Defensive clearYearSeps() at top of buildYearSeps().
 *                        Prevents duplicate separators when buildYearSeps is called
 *                        twice in quick succession (e.g. initViewToggle doSwap +
 *                        emhListings_refresh) without explicit clearYearSeps between.
 * v4.6.5 — 2026-05-04 — Fix duplicate year separators root cause: token must be
 *                        incremented BEFORE clearYearSeps(), not after. clearYearSeps
 *                        uses _iso.remove() which fires an internal layoutComplete.
 *                        Any pending _iso.once('layoutComplete', buildYearSeps) from
 *                        a prior call fires on that internal layout with the old token
 *                        still valid (not yet superseded) → buildYearSeps runs early
 *                        with stale data-year values, then runs again after arrange().
 *                        Fix: ++_buildYearSepsToken moved before clearYearSeps() in
 *                        doSwap(), applyFilters(), and applyZFCFilters(). Old pending
 *                        handler now sees token mismatch on clearYearSeps's layout
 *                        and no-ops. Only the post-arrange layoutComplete runs it.
 * v4.6.4 — 2026-05-02 — Fix duplicate year separators: token-guard on all three
 *                        _iso.once('layoutComplete', buildYearSeps) call sites.
 *                        initIsotope() and emhListings_refresh() both called
 *                        applyActiveFilters() → arrange() before the first
 *                        layoutComplete fired, leaving two pending callbacks.
 *                        _buildYearSepsToken incremented on each schedule;
 *                        stale callbacks check token and no-op if superseded.
 * v4.6.3 — 2026-04-30 — Fix 1: emhListings_refresh call order — sortCards(false)
 *                        now runs BEFORE applyActiveFilters so buildYearSeps
 *                        reads an already-sorted DOM. _iso.updateSortData()
 *                        called when Isotope is active so domOrder values
 *                        reflect the new DOM order before arrange().
 *                        Fix 2: equalizeRowHeights — after setting card heights,
 *                        detect if heights changed and call _iso.layout() to
 *                        re-position rows at equalized heights. Without this,
 *                        row 2+ Y positions were stale (based on natural heights)
 *                        causing cards to visually overlap. _equalizingHeights
 *                        prevents re-entry on the relayout layoutComplete.
 *                        Fix 3: CSS v2.1.0 — width:100%!important on inner view
 *                        wrapper added outside .zl-isotope-active so Oxygen pixel
 *                        widths can't bleed through on mobile (no Isotope).
 * v4.6.2 — 2026-04-29 — Fix double-animation jump on view switch and filter.
 *                        Root cause: clearYearSeps() called _iso.remove() which
 *                        triggered an internal layout() with animation, then
 *                        buildYearSeps() called _iso.arrange() for another —
 *                        two overlapping animations produced the visible jump.
 *                        Fix: (1) clearYearSeps() wraps _iso.remove() with
 *                        transitionDuration:'0s' — sep removal is mechanical.
 *                        (2) buildYearSeps(instant) — new flag; when true,
 *                        wraps _iso.arrange() with 0s (sep insertion instant).
 *                        (3) doSwap() restructured: clearYearSeps() (instant),
 *                        CSS swap, resetHeights, then single _iso.arrange() for
 *                        animated card repositioning, followed by
 *                        _iso.once('layoutComplete') → buildYearSeps(true).
 *                        (4) applyFilters/applyZFCFilters Isotope paths: replace
 *                        setTimeout(buildYearSeps,380) with the same
 *                        once('layoutComplete') → buildYearSeps(true) pattern.
 * v4.6.1 — 2026-04-29 — Fix year separators landing at bottom of layout.
 *                        Root cause: Isotope.addItems() appends to the END
 *                        of its internal items array regardless of DOM
 *                        position. Added getSortData.domOrder (DOM index
 *                        via Array.prototype.indexOf) + sortBy:'domOrder'
 *                        at init, and _iso.updateSortData() in buildYearSeps
 *                        before arrange(). Isotope now recalculates DOM
 *                        position for all items (including freshly inserted
 *                        seps) and sorts by that before layout — seps appear
 *                        between the correct year groups.
 * v4.6.0 — 2026-04-29 — Remove GSAP from filter path; let Isotope handle all
 *                        filter transitions natively. Changes:
 *                        (1) initIsotope: add hiddenStyle:{opacity:0} /
 *                        visibleStyle:{opacity:1} — eliminates scale(0.001)
 *                        zoom artifact on filtered items entering/leaving.
 *                        (2) applyZFCFilters: remove Paths 2 (GSAP Flip) and
 *                        3 (GSAP-only scale). Non-Isotope fallback is now a
 *                        plain display toggle (no animation). GSAP kept for
 *                        entrance stagger, search, chip, and view-fade only.
 *                        (3) equalizeRowHeights: remove section (c) vc-iso-
 *                        revealed class management — no longer needed now that
 *                        §20 CSS will be scoped to :not(.zl-isotope-active) and
 *                        hiddenStyle/visibleStyle own opacity fully.
 * v4.5.4 — 2026-04-29 — Fix: _switchingView reset line dropped from doSwap in prior
 *                        patch; was stuck true, blocking equalizeRowHeights on every
 *                        layoutComplete.
 * v4.5.3 — 2026-04-29 — Fix zl-vc-iso-revealed not applied: replace _iso.items.forEach
 *                        (not exposed in pkgd build) with DOM querySelectorAll fallback.
 * v4.5.2 — 2026-04-29 — Comprehensive opacity + height fix:
 *                        (1) Opacity: replace racy 500ms timer with CSS-class
 *                        approach. Add 'zl-vc-iso-revealed' class to filteredItems
 *                        in layoutComplete; CSS gives opacity:1 without
 *                        !important so Isotope inline opacity:0 on hidden items
 *                        still wins. When Outlayer removes inline opacity after
 *                        transition cleanup, the class holds revealed items
 *                        visible. Remove previous 500ms setTimeout hack.
 *                        (2) Heights: change equalizeRowHeights to global max
 *                        for both grid and list (was per-row for grid). Sean
 *                        wants ALL items the same height as the tallest item,
 *                        not per-row. Remove isListView branching.
 *                        (3) _switchingView flag: prevent equalizeRowHeights
 *                        from running during setView's clearYearSeps →
 *                        layoutComplete cycle (wrong view class active at that
 *                        point). Flag is true during doSwap's clear/class-swap
 *                        phase, cleared before buildYearSeps so final
 *                        layoutComplete equalizes correctly.
 * v4.5.1 — 2026-04-29 — Fix revealed-item opacity after filter transition.
 *                        Outlayer (Isotope's base) removes inline opacity from
 *                        revealed items after their CSS transition completes
 *                        (~350ms). Once removed, CSS §20's opacity:0/visibility:
 *                        hidden rule takes over, making the card invisible.
 *                        Fix: second layoutComplete listener schedules a 500ms
 *                        timeout (after stagger+transition ends) to re-apply
 *                        opacity:1/visibility:visible inline on all filteredItems.
 *                        500ms covers stagger delay (30ms × N items) + 350ms
 *                        transition for all items in any realistic filter result.
 * v4.5.0 — 2026-04-29 — Comprehensive Isotope correctness pass:
 *                        (1) clearYearSeps: use _iso.remove(seps) instead of
 *                        manual DOM removal + reloadItems(). _iso.remove()
 *                        removes from DOM AND items array; card Item objects
 *                        (with correct cached sizes) are untouched.
 *                        (2) buildYearSeps: use _iso.addItems(newSeps) instead
 *                        of reloadItems(). addItems registers the new sep
 *                        elements without recreating existing card Items.
 *                        Prevents cards from re-measuring at size=0 (which
 *                        caused the y:0→correct-pos transition glitch and
 *                        width=0 on revealed hidden items).
 *                        (3) initIsotope: run initial applyActiveFilters with
 *                        transitionDuration:'0s' so past events are hidden
 *                        instantly on load (no flash), then restore 0.35s.
 *                        (4) equalizeRowHeights: new function, fired on every
 *                        Isotope layoutComplete. Groups filteredItems by y-pos,
 *                        equalizes height to row max (grid) or global max
 *                        (list). Updates container height. Guarded by
 *                        _equalizingHeights flag to prevent re-entry.
 *                        (5) resetItemHeights: called before every _iso.arrange
 *                        so natural heights are re-measured before equalization.
 * v4.4.4 — 2026-04-29 — buildYearSeps: replace style.display!=='none' visibility
 *                        check with _iso.filteredItems lookup when Isotope active.
 *                        Isotope applies display:none asynchronously via
 *                        transitionend (~350ms after arrange()), so style.display
 *                        was unreliable at the 380ms setTimeout — past-event cards
 *                        still had display:'' and were incorrectly counted as
 *                        visible, causing SEP to inject before a hidden card and
 *                        both to land at y:0. filteredItems is set synchronously
 *                        by arrange(), so it correctly excludes past events.
 * v4.4.3 — 2026-04-29 — Fix Isotope jQuery bridge in filter functions.
 *                        Isotope pkgd uses jQuery(el).is(fn) when jQuery is
 *                        present; jQuery's .is(fn) calls fn.call(elem, index,
 *                        elem) so the first positional arg is the numeric index,
 *                        not the DOM element. Added guard: var elem = (el &&
 *                        el.nodeType===1) ? el : this; in both applyFilters and
 *                        applyZFCFilters Isotope paths. 'this' is reliably the
 *                        DOM element in jQuery's calling convention.
 * v4.4.2 — 2026-04-29 — Year seps: stamp approach broken in fitRows (stamps
 *                        only set maxY for future rows, items still start at
 *                        y=0 and overlap the stamp). Fix: make seps regular
 *                        Isotope items (itemSelector includes .zl_vc_year_sep).
 *                        width:100% forces them to own a full row. Filter fn
 *                        always returns true for seps. clearYearSeps uses
 *                        reloadItems() instead of unstamp(); buildYearSeps
 *                        uses reloadItems()+arrange() instead of stamp()+
 *                        layout(). doSwap() drops standalone layout() —
 *                        buildYearSeps' arrange() handles full re-measure.
 * v4.4.1 — 2026-04-29 — setView: always use fitRows layout mode; vertical
 *                        mode conflicted with percentPosition:true causing
 *                        wrong left% on list items. fitRows stacks items
 *                        naturally when CSS width is 100% (list) and tiles
 *                        them in rows when width is 33% (grid). Removed
 *                        void-reflow hack — no longer needed. doSwap() now
 *                        calls _iso.layout() instead of _iso.arrange() —
 *                        layout() re-measures item widths after CSS class
 *                        change; arrange() uses cached sizes and leaves items
 *                        at stale positions. GSAP opacity wrap bypassed when
 *                        Isotope active to prevent repeater stuck at opacity:0.
 * v4.4.0 — 2026-04-29 — Isotope.js integration. initIsotope() initializes
 *                        Isotope on the repeater (desktop ≥769px only) in
 *                        onComplete of the entrance animation. Filtering uses
 *                        _iso.arrange({filter:fn}) — CSS opacity transition
 *                        on .zl_emh_listings_parent drives the fade; Isotope
 *                        handles animated repositioning of remaining items.
 *                        View toggle uses same opacity fade + _iso.arrange
 *                        ({layoutMode}) to switch fitRows↔vertical. Year seps
 *                        use _iso.stamp()/unstamp() so they anchor correctly
 *                        in the absolute-positioned layout. Flip/GSAP paths
 *                        remain as fallback when Isotope unavailable/mobile.
 *                        CSS: §22 added (v2.0.4) — .zl-isotope-active overrides.
 * v4.3.0 — 2026-04-28 — Smoother transitions across the board:
 *                        setView: opacity-only fade on wrapper (no scale —
 *                        scaling full-width block causes reflow). Filters:
 *                        absolute:true on Flip.from so leaving items float
 *                        out without yanking grid layout; scale tightened
 *                        0.8→0.94, durations shortened, stagger halved.
 * v4.2.9 — 2026-04-28 — setView: scale+fade repeater wrapper. Filter Path 2
 *                        (GSAP-only fallback) updated to match scale 0.85↔1.
 * v4.2.8 — 2026-04-28 — setView: fade repeater wrapper (1 element, no per-item
 *                        state, no transforms). Kill/reset on rapid clicks.
 * v4.2.7 — 2026-04-28 — setView: replaced GSAP Flip with opacity fade.
 *                        Flip requires shared elements across states; tile/list
 *                        panels have different markup — Flip was accumulating
 *                        stuck transforms on rapid clicks. Fade out → swap
 *                        class → fade in. No transforms, fully interruptible.
 * v4.2.6 — 2026-04-28 — setView: attempted stored timeline kill + clearProps.
 *                        Reverted — clearProps:'all' wiped entrance-animation
 *                        opacity overrides, hiding cards.
 * v4.2.5 — 2026-04-28 — buildYearSeps() animates injected separators in with
 *                        GSAP fromTo (autoAlpha + y: -6, stagger 0.07, power3).
 *                        injectClearBtn() restyled: plain text + inline SVG ×
 *                        icon (no pill). CSS handles sizing via .zl_zfc_clear__x.
 * v4.2.4 — 2026-04-27 — Year separators: buildYearSeps() injects .zl_vc_year_sep
 *                        divs between year groups in list view; rebuilt on every
 *                        filter change / view toggle. Past Events toggle prunes
 *                        year chips (past-only years hidden when past = false).
 *                        Clear filters button (.zl_zfc_clear) injected into
 *                        .zl_zfc_bar_wrap; shown only when filters active; resets
 *                        all ZFC state + search + rebuilds chips.
 * v4.2.3 — 2026-04-27 — Nav entrance: ZFC groups stagger in with scale 0.8→1 +
 *                        power4.out (same as cards). Bar actions children also
 *                        stagger. Fixed initListingAnims() guard: removed typeof
 *                        ScrollTrigger check (ST removed in v4.1.3). Removed
 *                        staying-card scale dip from applyFilters/applyZFCFilters —
 *                        conflicts with Flip scale:true transform, corrupts layout.
 * v4.2.2 — 2026-04-27 — (Adjusted base from Sean)
 * v4.2.1 — 2026-04-27 — Unified scale language across all animations. Entrance:
 *                        scale 0.8+y -30 → 1+0 (power4.inOut). Filter onEnter:
 *                        scale 0.8→1 (power4.inOut). onLeave: scale 1→0.8
 *                        (power1.inOut). Negative y on entrance kills scrollbar.
 * v4.2.0 — 2026-04-27 — Sean's scale dip values applied. Filter Flip onEnter/onLeave
 *                        now animate scale 0.4↔1 + autoAlpha 0↔1 with stagger.
 * v4.1.9 — 2026-04-27 — Dial back view toggle: scale 0.85→0.93, alpha 0.85→0.92,
 *                        Flip duration 0.45→0.35, stagger 0.02→0.01, dip
 *                        durations 0.22/0.23→0.17/0.18. Subtler overall motion.
 * v4.1.8 — 2026-04-27 — View toggle: Flip + simultaneous scale dip. Flip handles
 *                        card repositioning, a parallel gsap.timeline dips all
 *                        cards to scale 0.85/autoAlpha 0.85 then back to 1.
 *                        GSAP composes scale and Flip's translate independently.
 * v4.1.7 — 2026-04-27 — View toggle: replace Flip with scale-dip transition.
 *                        Cards scale to 0.85 + fade to 0.7, layout class swaps
 *                        at the bottom, then scale/fade back to 1. No Flip on
 *                        toggle — Flip now only used for filter rearrangements.
 * v4.1.6 — 2026-04-27 — Flip ease: power1.inOut → sine.inOut (smoothest possible
 *                        curve, nearly linear, minimal scale amplification).
 * v4.1.5 — 2026-04-27 — Dial back Flip easing: power2.inOut → power1.inOut,
 *                        duration 0.5→0.4 (view toggle), 0.4→0.35 (filters).
 *                        scale:true amplifies easing, power1 keeps the organic
 *                        motion without the exaggerated overshoot.
 * v4.1.4 — 2026-04-27 — Replace absolute:true with scale:true in all Flip calls.
 *                        absolute:true pulls elements out of flow, collapsing the
 *                        container height and causing a post-animation jump.
 *                        scale:true keeps elements in flow and uses CSS transforms
 *                        for size transitions — no container collapse.
 * v4.1.3 — 2026-04-27 — Remove all ScrollTrigger usage. Controls, cards, and
 *                        data-vc-anim elements all fire on page load with no
 *                        viewport detection. applyFilters() Flip onEnter/onLeave
 *                        changed to plain fade — no scale re-entrance on filter
 *                        changes. One animation system: load stagger + Flip.
 * v4.1.2 — 2026-04-27 — Replace ScrollTrigger.batch() with single one-shot stagger.
 *                        Flip in applyFilters() owns all post-load animations.
 *                        Eliminates ScrollTrigger/Flip conflict causing jumpiness.
 * v4.1.1 — 2026-04-27 — Apply Sean's animation values: y:100, duration:0.5,
 *                        stagger:0.15. Split controls into .zl_zfc_group/.zl_zfc_wrap
 *                        and .zl_zfc_bar_actions animators. repeater declared before
 *                        controls so both can reference it.
 * v4.1.0 — 2026-04-27 — ScrollTrigger.batch() on cards so each card waits for
 *                        its own viewport entry. Stagger groups: data-vc-anim-group
 *                        system for inner elements. Flip plugin registration fix
 *                        in setView() and initListingAnims().
 * v4.0.1 — 2026-04-27 — Fix: gsap.from() → gsap.fromTo() throughout initListingAnims().
 *                        from() reads computed opacity:0 (set by CSS pre-hide) as the
 *                        target end state, so nothing appeared. fromTo() with explicit
 *                        autoAlpha:1 end state fixes this.
 * v4.0.0 — 2026-04-27 — GSAP entrance animations: initListingAnims() + data-vc-anim
 *                        attribute system. Trigger hooked into emhListings_refresh.
 *                        Removed initFirstVideoAutoplay + preloadVideos calls (caused
 *                        freeze-on-first-frame bug).
 * v3.9.1 — 2026-04-25 — Adds .zl_zfc_wrap--drawer to .zl_zfc_bar_wrap to gate CSS,
 *              wires accordion.
 * v3.9.0 — 2026-04-25 — ZFC rewritten to match Oxygen-built flat chip DOM.
 *                        Previous flyout drawer system (v3.7–3.8) targeted
 *                        .zl_zfc_toggle / .zl_zfc_drawer / .zl_zfc_flyout_panel which
 *                        never existed. Actual DOM uses .zl_zfc_group[data-zfc-filter]
 *                        → .zl_zfc_chips → .zl_zfc_chip. buildZFCOptions now populates
 *                        .zl_zfc_chips, initZFC attaches delegated click handlers
 *                        per group. Past filter is a boolean toggle on the
 *                        .zl_zfc_group--past chip. All flyout/drawer/measurement
 *                        code removed.
 * v3.8.1 — 2026-04-25 — Fix search input selector: #vc-search → #zl_emh_search.
 * v3.8.0 — 2026-04-25 — Animation fixes (superseded by v3.9.0).
 * v3.7.0 — 2026-04-24 — ZFC redesign: compact flyout drawer system.
 *                        Replaces horizontal chip bar with a toggle button that
 *                        slides a drawer open (GSAP width animation). Each filter
 *                        dimension has a flyout trigger (LABEL ↓) that opens a
 *                        floating panel below, overlaying the card grid. Panel
 *                        items are multi-select (OR within group, AND between).
 *                        Active trigger state: grey filled bg when selections exist.
 *                        Drawer overflow: hidden during animation, visible when open
 *                        so panels can escape the drawer bounds. Toggle button
 *                        gains .zl-has-active when any filter is selected.
 * v3.6.0 — 2026-04-24 — ZFC multi-select chip filter bar (replaced in v3.7.0).
 * v3.5.0 — 2026-04-24 — Search changed to version from crssd.com site.
 * v3.4.0 — 2026-04-23 — GSAP Flip enter/exit on filter/search/sort ops.
 * v3.3.0 — 2026-04-23 — CLS.grid/list updated to 'zl-grid-view'/'zl-list-view'.
 * v3.2.0 — 2026-04-23 — Search selectors renamed zl_emh_cntrl_srch_* → zl_emh_search_*
 * v3.1.0 — initHoverVideo() added (lazy Vimeo background video)
 *
 * Filter data attributes (set by WPCode #3589):
 *   data-brand      → ACF: brand
 *   data-venue      → ACF: venue (taxonomy)
 *   data-year       → ACF: year
 *   data-is-past    → "1" if start_date < today
 *   data-start-date → Ymd integer string (e.g. "20260420")
 *
* ZFC DOM structure (Oxygen-built native elements):
 *   .zl_zfc_bar_wrap                          — sticky outer container (node 568)
 *     .zl_zfc_wrap                            — flex row of filter groups (Code Block node 569)
 *       .zl_zfc_group[data-zfc-filter]        — one filter dimension
 *         .zl_zfc_group_label                 — "Brand", "Venue", "Year" — tap target in drawer mode
 *         .zl_zfc_chips                       — flex row of chips; absolute panel in drawer mode
 *           button.zl_zfc_chip[data-value]    — individual selectable chip (built by buildZFCOptions)
 *       .zl_zfc_group.zl_zfc_group--past         — past events boolean toggle; always inline
 *         button.zl_zfc_chip                  — single chip, no data-value, toggles zfcState.past
 *     .zl_zfc_bar_actions                     — right cluster: search toggle + grid/list toggle (node 575)
 *
 * Drawer mode: initZFCDrawer() adds .zl_zfc_wrap--drawer to .zl_zfc_bar_wrap.
 *   CSS gates all drawer layout under that class. Labels become accordion triggers.
 *   Past group is exempt — always renders inline regardless of drawer state.
 *
 * Requires: GSAP + Flip plugin (global, loaded before this script)
 * Deployment: WPCode #3757 → JavaScript → Footer, after GSAP CDN
 */

(function () {
  'use strict';

  // ─── Selectors ───────────────────────────────────────────────────────────────
  var SEL = {
    repeater:    '.zl_emh_listings_repeater',
    item:        '.zl_emh_listings_parent',
    toggleGrid:  '.zl_emh_cntrl_togl_grid',
    toggleList:  '.zl_emh_cntrl_togl_list',
    filterBrand: '.zl_emh_cntrl_fltr_brand select',
    filterVenue: '.zl_emh_cntrl_fltr_venue select',
    filterYear:  '.zl_emh_cntrl_fltr_year select',
    filterPast:  '.zl_emh_cntrl_fltr_past input[type="checkbox"]',
    searchWrap:  '.zl_emh_search_wrapper',
    searchToggle:'.zl_emh_search_toggle',
    searchInput: '#zl_emh_search',
    searchClear: '.zl_emh_search_clear',
    sortDate:    '.zl_emh_cntrl_sort_date',
    zfcWrap:     '.zl_zfc_wrap',
  };

  // ─── Class names ─────────────────────────────────────────────────────────────
  var CLS = {
    grid:      'zl-grid-view',
    list:      'zl-list-view',
    active:    'zl_emh_active',
    flipping:  'zl_emh_listings_flipping',
    isActive:  'zl-is-active',
    isOpen:    'zl-is-open',
    hasActive: 'zl-has-active',
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  var state = {
    view:      'grid',
    brand:     '',
    venue:     '',
    year:      '',
    past:      false,
    query:     '',
    sortOrder: 'asc',
  };

  // ─── ZFC state ───────────────────────────────────────────────────────────────
  var zfcActive = false;
  var zfcState = {
    brand: [],
    venue: [],
    year:  [],
    past:  false,
  };

  // ─── View toggle ─────────────────────────────────────────────────────────────
  // Opacity-only fade on the repeater wrapper — no scale, no layout shift.
  // When Isotope is active, doSwap() calls _iso.arrange({layoutMode}) to
  // switch fitRows↔vertical; the opacity fade hides the re-layout from view.
  var _viewTween = null;

  // Isotope instance — null until initIsotope() runs (desktop ≥769px only).
  var _iso = null;

  // Token incremented each time a new buildYearSeps layoutComplete callback is
  // scheduled. The callback checks its captured token against the current value
  // before running — stale callbacks (from overlapping arrange() calls) no-op.
  var _buildYearSepsToken = 0;

  // Guard flag — prevents equalizeRowHeights from re-entering via layoutComplete.
  var _equalizingHeights = false;

  // Guard flag — set during setView's doSwap phase (clearYearSeps → class switch)
  // to prevent equalizeRowHeights from firing with the wrong view class active.
  // Cleared before buildYearSeps so the final layoutComplete equalizes correctly.
  var _switchingView = false;

  // Reset explicit heights on all card items before a new arrange() call so
  // Isotope re-measures natural content heights for the equalization pass.
  function resetItemHeights() {
    var repeater = document.querySelector(SEL.repeater);
    if (!repeater) return;
    Array.from(repeater.querySelectorAll(SEL.item)).forEach(function (el) {
      el.style.height = '';
    });
    // Also clear any manually-set container height so Isotope can recalculate.
    if (_iso) repeater.style.height = '';
  }

  // After each Isotope layout pass:
  //   (a) Equalize all visible card heights to the global maximum — same max
  //       for both grid and list modes, since each mode has its own natural
  //       heights (list: 100% width, shorter; grid: 33% width, taller). Heights
  //       are reset on every mode switch via resetItemHeights() before arrange,
  //       so modes don't bleed into each other.
  //   (b) Update container height so content below the grid isn't overlapped.
  //   (c) Add 'zl-vc-iso-revealed' to filteredItems, remove from hidden items.
  //       CSS rule `.zl-isotope-active .zl_emh_listings_parent.zl-vc-iso-revealed`
  //       gives opacity:1 without !important — Isotope's inline opacity:0 on
  //       filtered-out items still overrides it. When Outlayer removes inline
  //       opacity from revealed items after CSS transition cleanup (~350ms),
  //       the class keeps them visible without needing a timer.
  //
  // Guarded by _equalizingHeights (re-entry) and _switchingView (view switch
  // intermediate layoutComplete events with wrong view class active).
  function equalizeRowHeights() {
    if (!_iso || _equalizingHeights || _switchingView) return;
    var filteredItems = _iso.filteredItems;
    if (!filteredItems || !filteredItems.length) return;

    var repeater = document.querySelector(SEL.repeater);
    if (!repeater) return;

    // ── (a) Global-max height equalization for card items (skip year seps) ───
    var cardEls = [];
    filteredItems.forEach(function (item) {
      if (!item.element.classList.contains('zl_vc_year_sep')) {
        cardEls.push(item.element);
      }
    });

    if (cardEls.length > 1) {
      var maxH = Math.max.apply(null, cardEls.map(function (el) { return el.offsetHeight; }));
      var _heightsChanged = false;
      cardEls.forEach(function (el) {
        if (Math.abs(el.offsetHeight - maxH) > 1) { _heightsChanged = true; }
        el.style.height = maxH + 'px';
      });

      if (_heightsChanged) {
        // Heights were unequal — Isotope's cached row positions are now stale.
        // Trigger a relayout at the new equalized heights so row 2+ cards land
        // at the correct Y (maxH + gap instead of natural_h + gap).
        // _equalizingHeights blocks re-entry when this layout's layoutComplete
        // fires; once handler clears it so subsequent filter/view layouts equalize.
        _equalizingHeights = true;
        _iso.once('layoutComplete', function () { _equalizingHeights = false; });
        _iso.layout();
        return; // container height will be updated by the relayout's layoutComplete
      }
    }

    // ── (b) Update container height ──────────────────────────────────────────
    var containerH = 0;
    filteredItems.forEach(function (item) {
      if (!item.position) return;
      var bottom = item.position.y + item.element.offsetHeight;
      if (bottom > containerH) containerH = bottom;
    });
    if (containerH) {
      var gapPx = parseInt(getComputedStyle(repeater).getPropertyValue('--emh-card-gap')) || 20;
      repeater.style.height = (containerH + gapPx) + 'px';
    }

  }

  function setView(v, repeater, animate) {
    state.view = v;

    function doSwap() {
      // Increment token BEFORE clearYearSeps so any pending _iso.once handler
      // from a prior call sees a token mismatch on clearYearSeps's internal
      // layoutComplete and no-ops. Only the post-arrange layoutComplete runs it.
      var _bysToken = ++_buildYearSepsToken;
      // Prevent equalizeRowHeights from running during the clearYearSeps and
      // class-swap phase — layoutComplete fires here with the old view class
      // still active, which would equalize at wrong widths/heights.
      _switchingView = true;
      clearYearSeps();
      repeater.classList.remove(CLS.grid, CLS.list);
      repeater.classList.add(v === 'grid' ? CLS.grid : CLS.list);
      if (_iso) {
        // Reset heights so items re-measure at natural content height for
        // the new view mode before equalization runs on layoutComplete.
        resetItemHeights();
        // Flush CSS before Isotope re-measures widths in buildYearSeps.
        void repeater.offsetWidth;
      }
      // Clear flag BEFORE the final arrange so layoutComplete correctly
      // equalizes at the new view's widths and heights.
      _switchingView = false;
      if (_iso) {
        // Single animated arrange for card repositioning. After cards settle,
        // snap seps in instantly to avoid a second visible animation (the jump).
        _iso.once('layoutComplete', function () { if (_bysToken === _buildYearSepsToken) buildYearSeps(true); });
        _iso.arrange();
      } else {
        buildYearSeps();
      }
    }

    // When Isotope is active: skip GSAP opacity wrap — GSAP fades out but
    // its onComplete/fade-in conflicts with Isotope's async RAF layout,
    // leaving the repeater stuck at opacity:0. Isotope's transitionDuration
    // animates item repositioning on its own; no wrapper needed.
    if (_iso) {
      doSwap();
      return;
    }

    if (animate && window.gsap) {
      if (_viewTween) {
        _viewTween.kill();
        _viewTween = null;
        gsap.set(repeater, { opacity: 1 });
      }

      _viewTween = gsap.to(repeater, {
        opacity:  0,
        duration: 0.18,
        ease:     'power2.in',
        onComplete: function () {
          doSwap();
          _viewTween = gsap.to(repeater, {
            opacity:    1,
            duration:   0.28,
            ease:       'power2.out',
            onComplete: function () { _viewTween = null; },
          });
        },
      });
      return;
    }

    doSwap();
  }

  function initViewToggle() {
    var repeater = document.querySelector(SEL.repeater);
    var btnGrid  = document.querySelector(SEL.toggleGrid);
    var btnList  = document.querySelector(SEL.toggleList);

    function activate(v) {
      if (!repeater) return;
      setView(v, repeater, true);
      if (btnGrid) btnGrid.classList.toggle(CLS.active, v === 'grid');
      if (btnList) btnList.classList.toggle(CLS.active, v === 'list');
      try { localStorage.setItem('zl_emh_listings_view', v); } catch (e) {}
    }

    var saved = 'grid';
    try {
      var _lsView  = localStorage.getItem('zl_emh_listings_view');
      var _defView = (window.emhListingsDefaults && window.emhListingsDefaults.view) || 'grid';
      saved = _lsView || _defView; // localStorage (user pref) > options-page default > 'grid'
    } catch (e) {}
    if (repeater) setView(saved, repeater, false);
    if (btnGrid) btnGrid.classList.toggle(CLS.active, saved === 'grid');
    if (btnList) btnList.classList.toggle(CLS.active, saved === 'list');

    if (btnGrid) btnGrid.addEventListener('click', function () { activate('grid'); });
    if (btnList) btnList.addEventListener('click', function () { activate('list'); });
  }

  // ─── Legacy dropdown filters ──────────────────────────────────────────────────

  function matchesFilters(el, q) {
    var brand  = (el.dataset.brand  || '').trim();
    var venue  = (el.dataset.venue  || '').trim();
    var year   = (el.dataset.year   || '').trim();
    var isPast = el.dataset.isPast === '1';

    if (state.brand && brand.toLowerCase() !== state.brand.toLowerCase()) return false;
    if (state.venue && venue.toLowerCase() !== state.venue.toLowerCase()) return false;
    if (state.year  && year !== state.year)                               return false;
    if (!state.past && isPast)                                            return false;

    if (q) {
      var haystack = [brand, venue, year,
        (el.querySelector('.zl_emh_listings_title') || {}).textContent || ''
      ].join(' ').toLowerCase();
      if (haystack.indexOf(q) < 0) return false;
    }

    return true;
  }

  function applyFilters(animate) {
    var q = state.query.toLowerCase();

    // Path 1: Isotope — CSS-transition-based filter + animated repositioning.
    // Isotope manages show/hide via opacity (CSS transition) and handles
    // reordering of visible items. Year seps rebuilt after layout settles.
    if (_iso) {
      // Increment token BEFORE clearYearSeps — see doSwap for explanation.
      var _bysToken = ++_buildYearSepsToken;
      clearYearSeps();
      resetItemHeights(); // reset before arrange so natural heights re-measured
      _iso.once('layoutComplete', function () { if (_bysToken === _buildYearSepsToken) buildYearSeps(true); });
      _iso.arrange({
        filter: function (el) {
          // Isotope pkgd (jQuery present) calls filter via jQuery.is(fn), which
          // passes the numeric index as the first positional arg. Use 'this' as
          // the reliable DOM element reference; guard for non-jQuery path too.
          var elem = (el && el.nodeType === 1) ? el : this;
          if (elem.classList.contains('zl_vc_year_sep')) return true; // seps always visible
          return matchesFilters(elem, q);
        },
      });
      syncClearBtn();
      return;
    }

    clearYearSeps(); // clear before Flip state capture so seps don't shift card positions
    var items = Array.from(document.querySelectorAll(SEL.item));

    var Flip = window.Flip ||
               (window.gsap && window.gsap.plugins && window.gsap.plugins.flip);

    // Path 2: GSAP Flip — positional animation for remaining cards
    if (animate !== false && Flip && window.gsap) {
      try {
        var flipState = Flip.getState(items);
        items.forEach(function (el) {
          el.style.display = matchesFilters(el, q) ? '' : 'none';
        });
        Flip.from(flipState, {
          duration: 0.35,
          ease:     'power2.inOut',
          absolute: true,
          onEnter: function (elements) {
            gsap.fromTo(elements,
              { autoAlpha: 0, scale: 0.94 },
              { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power2.out',
                stagger: 0.025, clearProps: 'scale' }
            );
          },
          onLeave: function (elements) {
            gsap.to(elements,
              { autoAlpha: 0, scale: 0.94, duration: 0.2, ease: 'power2.in',
                stagger: 0.015, clearProps: 'scale' }
            );
          },
          onComplete: buildYearSeps,
        });
        syncClearBtn();
        return;
      } catch (e) {}
    }

    // Path 3: GSAP only (no Flip) — scale + fade
    if (animate !== false && window.gsap) {
      items.forEach(function (el) {
        var show = matchesFilters(el, q);
        if (!show) {
          gsap.to(el, { autoAlpha: 0, scale: 0.94, duration: 0.2, ease: 'power2.in',
            onComplete: function () { el.style.display = 'none'; gsap.set(el, { clearProps: 'scale' }); } });
        } else {
          el.style.display = '';
          gsap.fromTo(el,
            { autoAlpha: 0, scale: 0.94 },
            { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'power2.out', clearProps: 'scale' });
        }
      });
      buildYearSeps();
      syncClearBtn();
      return;
    }

    // Path 4: No GSAP — instant
    items.forEach(function (el) {
      el.style.display = matchesFilters(el, q) ? '' : 'none';
    });
    buildYearSeps();
    syncClearBtn();
  }

  function populateFilters(items) {
    var brands = [];
    var venues = [];
    var years  = [];

    items.forEach(function (el) {
      var b  = (el.dataset.brand || '').trim();
      var ve = (el.dataset.venue || '').trim();
      var y  = (el.dataset.year  || '').trim();
      if (b  && brands.indexOf(b)  < 0) brands.push(b);
      if (ve && venues.indexOf(ve) < 0) venues.push(ve);
      if (y  && years.indexOf(y)   < 0) years.push(y);
    });

    brands.sort(); venues.sort(); years.sort();

    buildSelect(SEL.filterBrand, brands, 'All Brands');
    buildSelect(SEL.filterVenue, venues, 'All Venues');
    buildSelect(SEL.filterYear,  years,  'All Years');
  }

  function buildSelect(selector, values, placeholder) {
    var el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = '<option value="">' + placeholder + '</option>';
    values.forEach(function (val) {
      var opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      el.appendChild(opt);
    });
  }

  function initFilters() {
    var selBrand = document.querySelector(SEL.filterBrand);
    var selVenue = document.querySelector(SEL.filterVenue);
    var selYear  = document.querySelector(SEL.filterYear);
    var chkPast  = document.querySelector(SEL.filterPast);

    if (selBrand) selBrand.addEventListener('change', function () { state.brand = selBrand.value;  applyFilters(true); });
    if (selVenue) selVenue.addEventListener('change', function () { state.venue = selVenue.value;  applyFilters(true); });
    if (selYear)  selYear.addEventListener('change',  function () { state.year  = selYear.value;   applyFilters(true); });
    if (chkPast)  chkPast.addEventListener('change',  function () { state.past  = chkPast.checked; applyFilters(true); });
  }

  // ─── ZFC (Zoo Filter Controls) — flat chip groups ────────────────────────────
  // DOM structure (Oxygen-built, native elements):
  //   .zl_zfc_wrap
  //     .zl_zfc_group[data-zfc-filter="brand"] → .zl_zfc_chips → button.zl_zfc_chip[data-value]
  //     .zl_zfc_group[data-zfc-filter="venue"]  → .zl_zfc_chips → button.zl_zfc_chip[data-value]
  //     .zl_zfc_group[data-zfc-filter="year"]   → .zl_zfc_chips → button.zl_zfc_chip[data-value]
  //     .zl_zfc_group[data-zfc-filter="past"]   → button.zl_zfc_chip (boolean toggle, no data-value)
  //
  // Multi-select within group = OR logic. Multiple active groups = AND logic.
  // Past filter is a boolean toggle: off = hide past events, on = include them.

  // Rebuild chip buttons inside .zl_zfc_chips for each non-past group
  function buildZFCOptions(items) {
    var wrap = document.querySelector(SEL.zfcWrap);
    if (!wrap) return;

    wrap.querySelectorAll('.zl_zfc_group[data-zfc-filter]').forEach(function (group) {
      var filterKey = group.getAttribute('data-zfc-filter');
      if (filterKey === 'past') return; // static single-chip toggle, skip rebuild

      var chipsContainer = group.querySelector('.zl_zfc_chips');
      if (!chipsContainer) return;

      // Collect unique non-empty values from card data attrs.
      // For the year group: exclude past-only years when past events are hidden,
      // so years that only belong to past events don't appear as chip options.
      var pool = (filterKey === 'year' && !zfcState.past)
        ? items.filter(function (el) { return el.dataset.isPast !== '1'; })
        : items;

      var values = [];
      pool.forEach(function (el) {
        var val = (el.dataset[filterKey] || '').trim();
        if (val && values.indexOf(val) < 0) values.push(val);
      });
      values.sort();

      var selected = zfcState[filterKey] || [];

      // Rebuild chip buttons
      chipsContainer.innerHTML = '';
      values.forEach(function (val) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'zl_zfc_chip';
        btn.setAttribute('data-value', val);
        btn.setAttribute('aria-pressed', selected.indexOf(val) >= 0 ? 'true' : 'false');
        btn.textContent = val;
        if (selected.indexOf(val) >= 0) btn.classList.add(CLS.isActive);
        chipsContainer.appendChild(btn);
      });
    });
  }

  function matchesZFCFilters(el, q) {
    var brand  = (el.dataset.brand  || '').trim();
    var venue  = (el.dataset.venue  || '').trim();
    var year   = (el.dataset.year   || '').trim();
    var isPast = el.dataset.isPast === '1';

    if (zfcState.brand.length && zfcState.brand.indexOf(brand) < 0) return false;
    if (zfcState.venue.length && zfcState.venue.indexOf(venue) < 0) return false;
    if (zfcState.year.length  && zfcState.year.indexOf(year)   < 0) return false;
    if (!zfcState.past && isPast)                                    return false;

    if (q) {
      var haystack = [brand, venue, year,
        (el.querySelector('.zl_emh_listings_title') || {}).textContent || ''
      ].join(' ').toLowerCase();
      if (haystack.indexOf(q) < 0) return false;
    }

    return true;
  }

  function applyZFCFilters(animate) {
    var q = state.query.toLowerCase();

    // Path 1: Isotope — CSS-transition filter + animated repositioning.
    if (_iso) {
      // Increment token BEFORE clearYearSeps — see doSwap for explanation.
      var _bysToken = ++_buildYearSepsToken;
      clearYearSeps();
      resetItemHeights(); // reset before arrange so natural heights re-measured
      _iso.once('layoutComplete', function () { if (_bysToken === _buildYearSepsToken) buildYearSeps(true); });
      _iso.arrange({
        filter: function (el) {
          // Isotope pkgd (jQuery present) calls filter via jQuery.is(fn), which
          // passes the numeric index as the first positional arg. Use 'this' as
          // the reliable DOM element reference; guard for non-jQuery path too.
          var elem = (el && el.nodeType === 1) ? el : this;
          if (elem.classList.contains('zl_vc_year_sep')) return true; // seps always visible
          return matchesZFCFilters(elem, q);
        },
      });
      syncClearBtn();
      return;
    }

    // Path 2: No Isotope — instant display toggle (no GSAP animation in filter path).
    // GSAP Flip/scale caused zoom artifacts and conflicted with Isotope's own
    // hiddenStyle/visibleStyle transitions. Keep GSAP for entrance + UI chrome only.
    clearYearSeps();
    var items = Array.from(document.querySelectorAll(SEL.item));
    items.forEach(function (el) {
      el.style.display = matchesZFCFilters(el, q) ? '' : 'none';
    });
    buildYearSeps();
    syncClearBtn();
  }

  function applyActiveFilters(animate) {
    if (zfcActive) {
      applyZFCFilters(animate);
    } else {
      applyFilters(animate);
    }
  }

  function initZFC() {
    var wrap = document.querySelector(SEL.zfcWrap);
    if (!wrap || zfcActive) return;

    zfcActive = true;

    // Delegated click handler per group
    wrap.querySelectorAll('.zl_zfc_group[data-zfc-filter]').forEach(function (group) {
      var filterKey = group.getAttribute('data-zfc-filter');

      group.addEventListener('click', function (e) {
        var chip = e.target.closest('.zl_zfc_chip');
        if (!chip) return;

        if (filterKey === 'past') {
          // Boolean toggle — no data-value needed
          zfcState.past = !zfcState.past;
          chip.classList.toggle(CLS.isActive, zfcState.past);
          chip.setAttribute('aria-pressed', zfcState.past ? 'true' : 'false');
          // Rebuild year chips: past state change may add/remove past-only years
          var allItems = Array.from(document.querySelectorAll(SEL.item));
          buildZFCOptions(allItems);
        } else {
          // Multi-select array toggle
          var arr = zfcState[filterKey];
          if (!arr) return;
          var val = chip.getAttribute('data-value');
          if (!val) return;
          var idx = arr.indexOf(val);
          if (idx >= 0) {
            arr.splice(idx, 1);
            chip.classList.remove(CLS.isActive);
            chip.setAttribute('aria-pressed', 'false');
          } else {
            arr.push(val);
            chip.classList.add(CLS.isActive);
            chip.setAttribute('aria-pressed', 'true');
          }
        }

        applyZFCFilters(true);
      });
    });
  }

  // ─── Search (GSAP animated) ───────────────────────────────────────────────────
  function initSearch() {
    var wrap     = document.querySelector(SEL.searchWrap);
    var toggle   = document.querySelector(SEL.searchToggle);
    var input    = document.querySelector(SEL.searchInput);
    var clearBtn = document.querySelector(SEL.searchClear);

    if (!wrap || !toggle || !input) return;

    var isOpen = false;

    gsap.set(wrap,  { width: 32, overflow: 'hidden' });
    if (clearBtn) gsap.set(clearBtn, { opacity: 0, pointerEvents: 'none' });

    function openSearch() {
      if (isOpen) return;
      isOpen = true;
      wrap.classList.add('zl_emh_active');
      gsap.to(wrap, { width: 280, duration: 0.32, ease: 'power2.out',
        onComplete: function () { input.focus(); } });
    }

    function closeSearch() {
      if (!isOpen || (input && input.value)) return;
      isOpen = false;
      wrap.classList.remove('zl_emh_active');
      gsap.to(wrap, { width: 32, duration: 0.28, ease: 'power2.in' });
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen ? closeSearch() : openSearch();
    });

    input.addEventListener('input', function () {
      state.query = input.value.trim();
      applyActiveFilters(true);
      if (clearBtn) {
        gsap.to(clearBtn, {
          opacity:       state.query ? 1 : 0,
          pointerEvents: state.query ? 'auto' : 'none',
          duration: 0.18,
        });
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        input.value = '';
        state.query = '';
        applyActiveFilters(true);
        gsap.to(clearBtn, { opacity: 0, pointerEvents: 'none', duration: 0.18 });
        input.focus();
      });
    }

    document.addEventListener('click', function (e) {
      if (wrap && !wrap.contains(e.target)) closeSearch();
    });

    input.addEventListener('blur', function () {
      setTimeout(function () {
        if (!wrap.contains(document.activeElement)) closeSearch();
      }, 100);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen && !input.value) closeSearch();
    });
  }

  // ─── Date sort ───────────────────────────────────────────────────────────────
  function sortCards(animate) {
    var repeater = document.querySelector(SEL.repeater);
    if (!repeater) return;

    var cards = Array.from(document.querySelectorAll(SEL.item));
    if (cards.length < 2) return;

    var Flip = window.Flip ||
               (window.gsap && window.gsap.plugins && window.gsap.plugins.flip);

    var flipState = (animate !== false && Flip && window.gsap)
      ? (function () { try { return Flip.getState(cards); } catch (e) { return null; } })()
      : null;

    cards.sort(function (a, b) {
      var da = parseInt(a.dataset.startDate, 10) || 0;
      var db = parseInt(b.dataset.startDate, 10) || 0;
      if (da === 0 && db === 0) return 0;
      if (da === 0) return 1;
      if (db === 0) return -1;
      return state.sortOrder === 'desc' ? db - da : da - db;
    });

    cards.forEach(function (card) { repeater.appendChild(card); });

    if (flipState && Flip && window.gsap) {
      try {
        Flip.from(flipState, {
          duration: 0.45,
          ease:     'power2.inOut',
          stagger:  { each: 0.025, from: 'start' },
          absolute: true,
        });
      } catch (e) {}
    }
  }

  function initSortToggle() {
    var btn = document.querySelector(SEL.sortDate);
    if (!btn) return;

    function updateBtn() {
      btn.classList.toggle(CLS.active, state.sortOrder === 'desc');
      btn.setAttribute('aria-pressed', state.sortOrder === 'desc' ? 'true' : 'false');
      btn.title = state.sortOrder === 'asc' ? 'Sort: newest first' : 'Sort: oldest first';
    }

    btn.addEventListener('click', function () {
      state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      updateBtn();
      sortCards(true);
    });

    updateBtn();
  }

  
// ─── Hover video (lazy Vimeo) ─────────────────────────────────────────────────
function initHoverVideo() {
  var items = document.querySelectorAll(SEL.item);
  items.forEach(function (card) {
    var iframe = card.querySelector('iframe[data-src]');
    if (!iframe) return;
    var player = null;

    card.addEventListener('mouseenter', function () {
      if (!iframe.src) {
        iframe.src = iframe.getAttribute('data-src');
      }
      if (window.Vimeo) {
        if (!player) player = new Vimeo.Player(iframe);
        player.play().catch(function () {});
      }
    });

    card.addEventListener('mouseleave', function () {
      if (player) {
        player.pause().catch(function () {});
      }
    });
  });
}

// ─── Viewport video (mobile / touch) ─────────────────────────────────────────
// Below 992px: hover is unavailable. Load + play video for the card with the
// most screen real estate. Pause outgoing card when a new one takes over.
// On resize above 992px, initHoverVideo takes over; this observer is passive.
function initViewportVideo() {
  if (!window.matchMedia('(max-width: 992px)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var cards = Array.from(document.querySelectorAll(SEL.item))
                   .filter(function (c) { return c.querySelector('iframe[data-src]'); });
  if (!cards.length) return;

  var ratioMap   = new Map();
  var currentTop = null;

  function loadIframe(card) {
    var iframe = card.querySelector('iframe[data-src]');
    if (!iframe || iframe.src) return;
    iframe.src = iframe.getAttribute('data-src');
  }

  function updateTopCard() {
    var best      = null;
    var bestRatio = 0;

    ratioMap.forEach(function (ratio, card) {
      if (ratio > bestRatio) { bestRatio = ratio; best = card; }
    });

    // Require at least 15% visible — avoids flicker at edges
    if (!best || bestRatio < 0.15) best = null;
    if (best === currentTop) return;

    // Pause outgoing card
    if (currentTop) {
      var outIframe = currentTop.querySelector('iframe');
      if (outIframe) {
        outIframe.style.opacity = '0';
        if (outIframe.src && window.Vimeo) {
          new Vimeo.Player(outIframe).pause().catch(function () {});
        }
      }
    }

    currentTop = best;
    if (!best) return;

    // Play incoming card
    loadIframe(best);
    var inIframe = best.querySelector('iframe');
    if (inIframe) {
      inIframe.style.opacity = '1';
      if (window.Vimeo) {
        new Vimeo.Player(inIframe).play().catch(function () {});
      }
    }
  }

  var thresholds = [];
  for (var t = 0; t <= 20; t++) thresholds.push(t / 20); // 0, 0.05 … 1.0

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      ratioMap.set(entry.target, entry.intersectionRatio);
    });
    updateTopCard();
  }, { threshold: thresholds });

  cards.forEach(function (card) {
    ratioMap.set(card, 0);
    observer.observe(card);
  });
}
// ─── END Viewport video ───────────────────────────────────────────────────────
  // ─── END Staggered video ───────────────────────────────────────────────────────
  
  // ─── ZFC DRAWER ──────────────────────────────────────────────────────────────
  // Additive on top of v3.9.0. Call initZFCDrawer() after initZFC() in init().
  // Adds .zl_zfc_wrap--drawer to .zl_zfc_bar_wrap to gate CSS, wires accordion.
  
  function syncGroupHasActive(group) {
    group.classList.toggle('zl-has-active', !!group.querySelector('.zl_zfc_chip.' + CLS.isActive));
  }
  
  function openDrawerPanel(group) {
    var chips = group.querySelector('.zl_zfc_chips');
    if (!chips) return;
    group.classList.add('zl-is-open');
    if (window.gsap) {
      gsap.fromTo(chips, { opacity: 0, y: -5 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
    }
  }
  
  function closeDrawerPanels(wrap) {
    wrap.querySelectorAll('.zl_zfc_group.zl-is-open').forEach(function(group) {
      var chips = group.querySelector('.zl_zfc_chips');
      if (window.gsap && chips) {
        gsap.to(chips, {
          opacity: 0, y: -5, duration: 0.15, ease: 'power2.in',
          onComplete: function() {
            group.classList.remove('zl-is-open');
            gsap.set(chips, { clearProps: 'opacity,y' });
          }
        });
      } else {
        group.classList.remove('zl-is-open');
      }
    });
  }
  
  function initZFCDrawer() {
    var barWrap = document.querySelector('.zl_zfc_bar_wrap');
    var wrap    = document.querySelector(SEL.zfcWrap);
    if (!barWrap || !wrap) return;
  
    // Activate CSS-gated drawer styles
    barWrap.classList.add('zl_zfc_wrap--drawer');
  
    // Initial zl-has-active sync
    wrap.querySelectorAll('.zl_zfc_group[data-zfc-filter]').forEach(function(group) {
      syncGroupHasActive(group);
    });
  
    // Label click → accordion open/close
    wrap.querySelectorAll('.zl_zfc_group[data-zfc-filter]:not(.zl_zfc_group--past)').forEach(function(group) {
      var label = group.querySelector('.zl_zfc_group_label');
      if (!label) return;
      label.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = group.classList.contains('zl-is-open');
        closeDrawerPanels(wrap);
        if (!isOpen) openDrawerPanel(group);
      });
    });
  
    // Click outside → close all
    document.addEventListener('click', function(e) {
      if (!wrap.contains(e.target)) closeDrawerPanels(wrap);
    });
  
    // Sync zl-has-active after chip toggles (defer so initZFC handler fires first)
    wrap.addEventListener('click', function(e) {
      var chip = e.target.closest('.zl_zfc_chip');
      if (!chip) return;
      var group = chip.closest('.zl_zfc_group[data-zfc-filter]');
      if (group) setTimeout(function() { syncGroupHasActive(group); }, 0);
    });
  
    // Keep zl-has-active in sync after emhListings_refresh rebuilds chips
    var _origRefresh = window.emhListings_refresh;
    window.emhListings_refresh = function() {
      if (_origRefresh) _origRefresh.apply(this, arguments);
      wrap.querySelectorAll('.zl_zfc_group[data-zfc-filter]').forEach(function(group) {
        syncGroupHasActive(group);
      });
    };
  }
  // ─── END ZFC DRAWER ──────────────────────────────────────────────────────────

  // ─── Isotope layout engine ────────────────────────────────────────────────────
  // Called from initListingAnims onComplete (after entrance anim, so all cards
  // already have opacity:1 inline). Desktop only — below 769px falls back to
  // the existing flex/Flip/GSAP paths.
  //
  // Requires Isotope.js loaded before this script, e.g.:
  //   <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.isotope/3.0.6/isotope.pkgd.min.js"><\/script>
  // or the standalone (non-jQuery) build from isotope.metafizzy.co.

  function initIsotope() {
    if (typeof Isotope === 'undefined') return;
    if (!window.matchMedia('(min-width: 769px)').matches) return;

    var repeater = document.querySelector(SEL.repeater);
    if (!repeater || _iso) return; // guard against double-init

    // .zl-isotope-active switches repeater from flex to position:relative
    // and overrides item widths (see §22 of vc-listings.css).
    repeater.classList.add('zl-isotope-active');

    // Always fitRows — CSS width drives list (100%) vs grid (33%) layout.
    _iso = new Isotope(repeater, {
      itemSelector:       SEL.item + ', .zl_vc_year_sep',
      layoutMode:         'fitRows',
      fitRows:            { gutter: 20 },  // px between items; item CSS uses calc(33.333% - 20px)
      transitionDuration: '0.35s',
      percentPosition:    false,  // pixel positions; percentPosition:true + px gutter breaks fitRows row calc
      stagger:            30,               // ms between item transitions on reorder
      // Pure opacity fade — no scale transform on filter show/hide.
      // Default Isotope hiddenStyle includes scale(0.001) which causes a zoom
      // effect on items entering/leaving filter results.
      hiddenStyle:        { opacity: 0 },
      visibleStyle:       { opacity: 1 },
      // DOM order sort: Isotope.addItems() appends new items to the END of its
      // internal items array regardless of DOM position. Without sortBy, year
      // separators (inserted via insertBefore into the correct DOM position)
      // always land at the bottom of the layout. getSortData.domOrder captures
      // each item's index in the repeater's children list; updateSortData() in
      // buildYearSeps() refreshes this after sep insertion so arrange() uses
      // correct DOM order for layout.
      getSortData: {
        domOrder: function (el) {
          return Array.prototype.indexOf.call(el.parentNode.children, el);
        },
      },
      sortBy: 'domOrder',
    });

    // Equalize heights on every layout pass.
    _iso.on('layoutComplete', equalizeRowHeights);

    // Apply the current filter state instantly (no transition) so past events
    // are hidden immediately on load without a visible flash.
    _iso.option({ transitionDuration: '0s' });
    applyActiveFilters(false);
    // Restore smooth transitions for subsequent filter/view interactions.
    setTimeout(function () { if (_iso) _iso.option({ transitionDuration: '0.35s' }); }, 50);
  }

  // ─── Entrance animations ───────────────────────────────────────────────────────
  // Requires GSAP + ScrollTrigger loaded before this script.
  // Skipped entirely inside Oxygen builder so elements stay editable.
  //
  // Cards + controls animate automatically on first load.
  // Individual elements use data attributes for per-element control:
  //
  //   data-vc-anim                         marks element for animation
  //   data-vc-anim-type   fade-up* | fade-down | fade-left | fade-right | fade | scale-up
  //   data-vc-anim-duration  seconds        default 0.8
  //   data-vc-anim-delay     seconds        default 0
  //   data-vc-anim-ease      GSAP string    default power2.out
  //   data-vc-anim-dist      px or %        default 40
  //   data-vc-anim-start     ST string      default "top 90%"
  //   data-vc-anim-stagger   seconds        default 0 (staggers direct children when > 0)
  //
  function initListingAnims() {
    if (typeof gsap === 'undefined') return;
    if (document.body.classList.contains('oxygen-builder-body')) return;

    if (window.Flip) { try { gsap.registerPlugin(window.Flip); } catch (e) {} }

    // ── Repeater ref (needed by controls and cards) ───────────────────────────
    var repeater = document.querySelector(SEL.repeater);

    // ── ZFC filter groups — stagger in ────────────────────────────────────────
    var zfcGroups = Array.from(document.querySelectorAll('.zl_zfc_group'));
    if (zfcGroups.length) {
      gsap.fromTo(zfcGroups,
        { autoAlpha: 0, scale: 0.8 },
        { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.07, ease: 'power4.out', delay: 0.1 }
      );
    }

    // ── Bar actions children (search + view toggle) — stagger in ─────────────
    var actionsWrap = document.querySelector('.zl_zfc_bar_actions');
    if (actionsWrap) {
      var actionItems = Array.from(actionsWrap.children);
      if (actionItems.length) {
        gsap.fromTo(actionItems,
          { autoAlpha: 0, scale: 0.8 },
          { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.07, ease: 'power4.out', delay: 0.1 }
        );
      }
    }

    // ── Card entrance — one-shot stagger on load ──────────────────────────────
    // Runs once. After this, Flip in applyFilters() owns all enter/leave/reorder
    // animations. ScrollTrigger.batch is intentionally avoided here to prevent
    // conflicts with Flip state captures on filter/sort/view changes.
    if (repeater) {
      var cards = Array.from(repeater.querySelectorAll(SEL.item));
      if (cards.length) {
        gsap.fromTo(cards,
          { autoAlpha: 0, scale: 0.8, y: 0 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.08,
            ease: 'power4.out',
            delay: 0.1,
            // Initialize Isotope after all cards are visible so it reads
            // correct positions. GSAP's inline opacity:1 is already set on
            // each card at this point — Isotope takes over from here.
            onComplete: initIsotope,
          }
        );
      }
    }

    // ── Per-element animations via [data-vc-anim] ─────────────────────────────
    document.querySelectorAll('[data-vc-anim]').forEach(function (el) {
      if (el._vcAnimDone) return;
      el._vcAnimDone = true;

      var type     = el.getAttribute('data-vc-anim-type')                || 'fade-up';
      var duration = parseFloat(el.getAttribute('data-vc-anim-duration')) || 0.8;
      var delay    = parseFloat(el.getAttribute('data-vc-anim-delay'))    || 0;
      var ease     = el.getAttribute('data-vc-anim-ease')                || 'power2.out';
      var start    = el.getAttribute('data-vc-anim-start')               || 'top 90%';
      var distRaw  = el.getAttribute('data-vc-anim-dist')                || '40';
      var stagger  = parseFloat(el.getAttribute('data-vc-anim-stagger')) || 0;

      var distNum    = parseFloat(distRaw);
      var usePercent = distRaw.indexOf('%') > -1;
      var yKey = usePercent ? 'yPercent' : 'y';
      var xKey = usePercent ? 'xPercent' : 'x';

      var fromVars = { autoAlpha: 0 };
      var toVars   = { autoAlpha: 1, duration: duration, delay: delay, ease: ease };

      if (type === 'fade-up')    { fromVars[yKey] =  distNum; toVars[yKey] = 0; }
      if (type === 'fade-down')  { fromVars[yKey] = -distNum; toVars[yKey] = 0; }
      if (type === 'fade-left')  { fromVars[xKey] =  distNum; toVars[xKey] = 0; }
      if (type === 'fade-right') { fromVars[xKey] = -distNum; toVars[xKey] = 0; }
      if (type === 'scale-up')   { fromVars.scale  =  0.92;   toVars.scale  = 1; }
      // 'fade' — autoAlpha only, no translation

      var targets = (stagger > 0) ? Array.from(el.children) : el;
      if (stagger > 0) toVars.stagger = stagger;

      gsap.fromTo(targets, fromVars, toVars);
    });

    // ── Stagger groups via data-vc-anim-group ─────────────────────────────────
    // Elements sharing the same group number animate simultaneously.
    // Groups fire in ascending numeric order, each waiting for the previous
    // group's animation to complete before starting.
    //
    // Attributes on each element:
    //   data-vc-anim-group      required  group number (e.g. "1", "2", "3")
    //   data-vc-anim-type       optional  fade-up | fade-down | fade-left | fade-right | scale-up | fade
    //   data-vc-anim-duration   optional  seconds, default 0.6
    //   data-vc-anim-ease       optional  GSAP ease string, default power2.out
    //   data-vc-anim-dist       optional  px distance, default 24
    //   data-vc-anim-gap        optional  seconds between this group and the next, default 0.08
    //
    var groupEls = Array.from(document.querySelectorAll('[data-vc-anim-group]'));
    if (groupEls.length) {
      var groups = {};
      groupEls.forEach(function (el) {
        var g = el.getAttribute('data-vc-anim-group');
        if (!groups[g]) groups[g] = [];
        groups[g].push(el);
      });

      var sortedKeys = Object.keys(groups).sort(function (a, b) {
        return parseFloat(a) - parseFloat(b);
      });

      var cumDelay = 0;
      sortedKeys.forEach(function (key) {
        var batch    = groups[key];
        var first    = batch[0];
        var duration = parseFloat(first.getAttribute('data-vc-anim-duration')) || 0.6;
        var ease     = first.getAttribute('data-vc-anim-ease')                || 'power2.out';
        var type     = first.getAttribute('data-vc-anim-type')                || 'fade-up';
        var distRaw  = first.getAttribute('data-vc-anim-dist')                || '24';
        var gap      = parseFloat(first.getAttribute('data-vc-anim-gap'))     || 0.08;
        var distNum  = parseFloat(distRaw);

        var fromVars = { autoAlpha: 0 };
        var toVars   = { autoAlpha: 1, duration: duration, delay: cumDelay, ease: ease };

        if (type === 'fade-up')    { fromVars.y =  distNum; toVars.y = 0; }
        if (type === 'fade-down')  { fromVars.y = -distNum; toVars.y = 0; }
        if (type === 'fade-left')  { fromVars.x =  distNum; toVars.x = 0; }
        if (type === 'fade-right') { fromVars.x = -distNum; toVars.x = 0; }
        if (type === 'scale-up')   { fromVars.scale = 0.92; toVars.scale = 1; }

        gsap.fromTo(batch, fromVars, toVars);
        cumDelay += duration + gap;
      });
    }

  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  // ─── Year separators ─────────────────────────────────────────────────────────
  // Injected as siblings inside the repeater between year-group transitions.
  // List view only. Cleared before Flip.getState, rebuilt in onComplete.

  function clearYearSeps() {
    var repeater = document.querySelector(SEL.repeater);
    if (!repeater) return;
    var seps = Array.from(repeater.querySelectorAll('.zl_vc_year_sep'));
    if (!seps.length) return;
    if (_iso) {
      // _iso.remove() removes from both DOM and Isotope's items array.
      // Card Item objects (with their cached sizes) are untouched.
      // Wrap with 0s transition — sep removal is mechanical (not UX-visible).
      // Prevents _iso.remove()'s internal layout() from firing a visible
      // animation that would overlap the subsequent _iso.arrange() call.
      var prevDur = _iso.options.transitionDuration;
      _iso.options.transitionDuration = '0s';
      _iso.remove(seps);
      _iso.options.transitionDuration = prevDur;
    } else {
      seps.forEach(function (el) { el.parentNode.removeChild(el); });
    }
  }

  function buildYearSeps(instant) {
    // Defensive clear: ensures any seps from a previous call (e.g. from
    // initViewToggle's doSwap) are removed before we insert new ones.
    // Prevents duplicate separators when buildYearSeps is called twice in
    // quick succession without an explicit clearYearSeps() in between.
    clearYearSeps();

    var repeater = document.querySelector(SEL.repeater);
    if (!repeater) return;

    // Determine which cards are currently visible.
    // When Isotope is active we use _iso.filteredItems (set synchronously
    // by arrange()) rather than style.display — Isotope applies display:none
    // asynchronously via transitionend (~350ms after arrange), so
    // style.display is unreliable immediately after a filter call.
    var cards;
    if (_iso && _iso.filteredItems) {
      var filteredElems = _iso.filteredItems.map(function (item) { return item.element; });
      cards = Array.from(repeater.querySelectorAll(SEL.item)).filter(function (el) {
        return filteredElems.indexOf(el) !== -1;
      });
    } else {
      cards = Array.from(repeater.querySelectorAll(SEL.item)).filter(function (el) {
        return el.style.display !== 'none';
      });
    }

    var lastYear = null;
    var newSeps  = [];
    cards.forEach(function (card) {
      var year = (card.dataset.year || '').trim();
      if (!year || year === lastYear) return;
      var sep = document.createElement('div');
      sep.className = 'zl_vc_year_sep';
      sep.setAttribute('data-sep-year', year);
      sep.innerHTML =
        '<span class="zl_vc_year_sep__label">' + year + '</span>' +
        '<span class="zl_vc_year_sep__rule"></span>' +
        '<span class="zl_vc_year_sep__tag">Event Properties</span>';
      repeater.insertBefore(sep, card);
      newSeps.push(sep);
      lastYear = year;
    });

    if (!newSeps.length) return;

    if (_iso) {
      // Seps are already inserted in the DOM at the correct positions via
      // insertBefore(). addItems() registers them with Isotope WITHOUT
      // recreating existing card Item objects (preserving cached sizes).
      // CRITICAL: addItems() appends new items to the END of Isotope's
      // internal array — DOM position is ignored. updateSortData() recalculates
      // the 'domOrder' sort key for every item (including newly added seps)
      // based on current DOM index. arrange() then sorts by domOrder so seps
      // land between the correct year groups in the layout.
      _iso.addItems(newSeps);
      _iso.updateSortData();
      // instant=true: called from layoutComplete after card animation already
      // completed — use 0s to snap seps into place without a third overlapping
      // animation. Normal (instant=false) path uses the configured duration.
      if (instant) {
        var prevDur = _iso.options.transitionDuration;
        _iso.options.transitionDuration = '0s';
        _iso.arrange();
        _iso.options.transitionDuration = prevDur;
      } else {
        _iso.arrange();
      }
    } else if (typeof gsap !== 'undefined') {
      // Non-Isotope path: animate seps in with GSAP
      gsap.fromTo(newSeps,
        { autoAlpha: 0, y: -6 },
        { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power3.out' }
      );
    }
  }

  // ─── Clear filters button ─────────────────────────────────────────────────────

  function hasActiveFilters() {
    return (zfcState.brand.length > 0) ||
           (zfcState.venue.length > 0) ||
           (zfcState.year.length  > 0) ||
           (!!state.query);
  }

  function syncClearBtn() {
    var btn = document.querySelector('.zl_zfc_clear');
    if (!btn) return;
    btn.style.display = hasActiveFilters() ? 'flex' : 'none';
  }

  function injectClearBtn() {
    var barWrap = document.querySelector('.zl_zfc_bar_wrap');
    if (!barWrap || barWrap.querySelector('.zl_zfc_clear')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zl_zfc_clear';
    btn.style.display = 'none';
    btn.innerHTML =
      'Clear Filters' +
      '<svg class="zl_zfc_clear__x" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>';

    // Insert inside .zl_zfc_bar_fltr_wrap (after .zl_zfc_wrap)
    var fltrWrap = barWrap.querySelector('.zl_zfc_bar_fltr_wrap');
    if (fltrWrap) {
      fltrWrap.appendChild(btn);
    } else {
      // Fallback: insert before .zl_zfc_bar_actions
      var actions = barWrap.querySelector('.zl_zfc_bar_actions');
      barWrap.insertBefore(btn, actions || null);
    }

    btn.addEventListener('click', function () {
      // Reset all filter state
      zfcState.brand = [];
      zfcState.venue = [];
      zfcState.year  = [];
      zfcState.past  = false;
      state.brand = '';
      state.venue = '';
      state.year  = '';
      state.past  = false;
      state.query = '';

      // Reset chip visual states + group zl-has-active
      document.querySelectorAll('.zl_zfc_chip.zl-is-active').forEach(function (chip) {
        chip.classList.remove(CLS.isActive);
        chip.setAttribute('aria-pressed', 'false');
      });
      document.querySelectorAll('.zl_zfc_group[data-zfc-filter]').forEach(function (group) {
        group.classList.remove(CLS.hasActive);
      });

      // Clear search input
      var searchInput = document.querySelector(SEL.searchInput);
      if (searchInput) searchInput.value = '';

      // Rebuild ZFC options (year chips may change after past reset)
      var items = Array.from(document.querySelectorAll(SEL.item));
      if (zfcActive) buildZFCOptions(items);

      applyActiveFilters(true);
      syncClearBtn();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  function init() {
    var items = Array.from(document.querySelectorAll(SEL.item));

    // ── Apply options-page defaults before any UI init ────────────────────────
    // window.emhListingsDefaults is output by zoo-defaults-output.php (wp_footer
    // priority 1), so it is always set before this IIFE runs on DOMContentLoaded.
    if (window.emhListingsDefaults) {
      var _d = window.emhListingsDefaults;
      if (_d.past !== undefined) {
        state.past    = !!_d.past;
        zfcState.past = !!_d.past;
      }
      if (Array.isArray(_d.brand) && _d.brand.length) zfcState.brand = _d.brand.slice();
      if (Array.isArray(_d.venue) && _d.venue.length) zfcState.venue = _d.venue.slice();
      if (Array.isArray(_d.year)  && _d.year.length)  zfcState.year  = _d.year.slice();
    }

    initZFC(); // must run before initFilters so zfcActive is set

    // Sync ZFC chip active states from defaults (initZFC attaches handlers but
    // doesn't read zfcState to set initial active classes — do it here).
    if (zfcState.past) {
      var _pastChip = document.querySelector('.zl_zfc_group--past .zl_zfc_chip');
      if (_pastChip) {
        _pastChip.classList.add(CLS.isActive);
        _pastChip.setAttribute('aria-pressed', 'true');
      }
    }
    // Sync old filter checkbox (non-ZFC layout)
    var _chkPast = document.querySelector(SEL.filterPast);
    if (_chkPast) _chkPast.checked = !!state.past;

    populateFilters(items);
    if (zfcActive) buildZFCOptions(items);
    initZFCDrawer();

    initFilters();
    initViewToggle();
    initSearch();
    initSortToggle();
    initHoverVideo();
    initViewportVideo();
    injectClearBtn();
    applyActiveFilters(false);
  }

  // Exposed for WPCode #3589 — called after data-attrs and chips are injected.
  var _animsInited = false;
  window.emhListings_refresh = function () {
    var items = Array.from(document.querySelectorAll(SEL.item));
    populateFilters(items);
    if (zfcActive) buildZFCOptions(items);
    // Sort DOM FIRST so buildYearSeps (called inside applyActiveFilters) reads
    // the correct card order. animate=false skips GSAP Flip on initial inject.
    sortCards(false);
    // Tell Isotope about the new DOM order so domOrder sort data is current
    // before the arrange() inside applyActiveFilters reads it.
    if (_iso) { _iso.updateSortData(); }
    applyActiveFilters(false);
    syncClearBtn();
    if (!_animsInited) {
      _animsInited = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(initListingAnims);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();