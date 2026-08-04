# zoo-listings-live

Live-sync **sandbox** assets for the Zoo Agency event-property listings system
(zooagency.com). This repo is the "source of truth" that the WordPress
`[zoo_listings_live]` shortcode pulls from at render time, so the sandbox page
("Page B") reflects the latest committed code without anyone re-pasting it into
WPCode.

**This is the sandbox/preview surface — not production.** Production
(`vc-listings.js` #3866, `vc-listings.css` #3867, `emh-listings-data-attrs.php`
#3589 + Oxygen post 815) is still updated by hand by Sean. Changes proven here
get promoted to production separately.

## Files

| File | Role |
|---|---|
| `vc-listings.js` | Verbatim copy of the production engine (v4.6.6). Filters, ZFC chips, view toggle, search, hover video, year separators, GSAP/Isotope. |
| `vc-listings.css` | Verbatim copy of the production styles (v2.1.0). |
| `zoo-live-render.js` | **Sandbox-only.** Builds the `emh_*` card DOM + ZFC bar from `window.ZOO_LIVE_DATA` and sets `data-*` directly (replaces the Oxygen markup **and** WPCode #3589 for the sandbox). Reports height to the host page for iframe auto-sizing. |

## How it fits together

The WordPress shortcode (`zoo-listings-live.php`, kept in the Dropbox package,
installed once and never edited) does three things:

1. Queries the `vc_event_property` CPT → a JSON array of listings.
2. Server-side-fetches these three files from GitHub (raw), cached ~60s
   (bust with `?zl_refresh=1`).
3. Writes an **isolated iframe** whose document inlines: the parent page's live
   `--zoo-*` theme tokens, the Adobe Fonts kit, `vc-listings.css`, the JSON data,
   `zoo-live-render.js`, then `vc-listings.js`.

Because the iframe is a separate document, it never collides with the
site-wide production assets, yet reuses the exact production engine + styles.

## Editing

Commit changes to `main`. The sandbox page reflects them within ~60s (or
immediately with `?zl_refresh=1`). Iterate here; port proven changes to
production by hand.
