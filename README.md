# FocusLock website

Static marketing site for [FocusLock](src/config.ts), built with Astro + Tailwind.
No backend, no third-party requests (fonts are self-hosted).

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/, host it anywhere
npm run preview   # serve the built dist/ locally
```

## Downloads (hosted by this site)

The site serves the app itself from `public/download/`:
`FocusLock.dmg`, `FocusLock.zip`, `checksums.txt`, `latest.json` and `install.sh`.

After building a new app release (`scripts/package.sh` in the app repo), copy it in:

```sh
npm run sync-download                                    # local testing (localhost:4321)
SITE_URL=https://your-site.example npm run sync-download    # before deploying
```

`SITE_URL` is baked into `install.sh`, because `curl … | bash` can't know where it
came from. Also set `url` in `src/config.ts` to the same address, so the
install command shown on the page is correct. (In `npm run dev` the command
uses localhost automatically.)

## Share image (link previews)

`public/og.png` (1200×630) is what X, Slack, iMessage etc. show for a link to the
site. It's rendered from `src/pages/og-image.astro`. After changing that page:

```sh
npm run dev      # in one terminal
npm run og       # in another: rewrites public/og.png
```

Link previews need absolute image URLs, so set `url` in `src/config.ts` before
deploying.

## Analytics (off by default)

The app never sends anything. The website can optionally count visits and two
events, `download-dmg` and `copy-install-command`, with a cookie-less provider.
Set `analytics` in `src/config.ts`:

```ts
analytics: { provider: "goatcounter", id: "your-code" }   // free: goatcounter.com
analytics: { provider: "plausible", id: "your-domain" }   // plausible.io
```

Curl installs can't be seen by website analytics (Terminal doesn't run page
scripts). The installer downloads `FocusLock.zip?via=installer`, so count those
in your host's request logs, or use GitHub Releases' per-file download counts.
The FAQ's privacy answer updates itself when analytics are on.

## Links and release info

Every external link, the version and the requirements live in **`src/config.ts`**.
Values starting with `TODO` are placeholders: while the download link is a
placeholder, the Download button shows "Coming soon" and is disabled.

## Structure

| Path | What |
|---|---|
| `src/config.ts` | links, version, requirements (the only place to edit for a release) |
| `src/pages/index.astro` | the page |
| `src/layouts/Base.astro` | `<head>`, fonts, global styles |
| `src/components/Hero.astro` | headline band + pitch + demo |
| `src/components/FakeDesktop.astro` | the interactive fake macOS desktop (markup + styles) |
| `src/scripts/desktop.ts` | its behaviour: timer, windows, bounce, pass dialog |
| `src/components/DownloadCTA.astro` | download button, "Coming soon", non-Mac message |
| `src/components/StickyTimer.astro` | small floating countdown (desktop only, dismissible) |
| `src/styles/global.css` | Tailwind + design tokens (colors, fonts) |
| `public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | the app icon (from the app repo's `assets/`) |
| `public/og.png`, `src/pages/og-image.astro` | link-preview image and its source |
| `public/download/` | the app downloads (`npm run sync-download`) |

All motion respects `prefers-reduced-motion`. The demo's icons are original
generic SVGs, not real app logos.
