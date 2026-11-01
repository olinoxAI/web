# OliNox — WAVES

One-page album website. No frameworks, no external dependencies. 4 essential files:

- `index.html` — document and SEO / links
- `styles.css` — design, responsive layout and widths
- `app.js` — navigation, MP3 player, canvas wave and JSON rendering
- `tracks.json` — all 12 songs, their lyrics, ideas, model use, instruments, tools and common mastering

## Your audio and artwork

Copy your real `webalbum.jpg` to this folder. It will appear **under the 1,800-particle canvas animation**. If missing, a gradient fallback appears instead.

Copy your existing 12 MP3 files into this folder; filenames must match `audio` in `tracks.json` exactly. MP3s are not included in this ZIP.

Optional `favicon.png` may be copied into this folder.

## Running locally / publishing

A JSON file cannot usually be loaded when opening `index.html` directly as `file://`. Use a local HTTP server:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/ — or on Windows double-click the supplied `start-local.bat` (requires Python).

For GitHub Pages or other static hosting, upload the files together. No build process is needed.

## Behaviour

- On first load the left column shows album art + canvas particles.
- Play on a track starts/pauses its MP3 and opens that track's **Lyrics** at left.
- Click Lyrics or Behind the Scenes on any row to replace the left panel, **without interrupting audio**.
- Left tabs switch between Lyrics / Behind the Scenes for the chosen track.
- Left arrows navigate previous/next song without auto-playing.
- “← Album art” restores the animated cover while music may continue playing.
- Direct URL: `index.html?track=5&view=behind` or `index.html?track=5&view=lyrics`.

## Editing

For the site width, edit `--content-width` in `styles.css`. For the left panel width, edit `--left-width`.

In `tracks.json`:
- `lyrics`: each section has a `label` and an array `lines`.
- `story.lead` and `story.context`: your human idea and what the song means.
- `ai.lyrics`, `ai.melody`, `ai.vocals`: each has a `percent` (0–100 or `null`) and `model` name.
- `elements`: each element has a `name`, `method`, and list of `tools` (can include Suno version, Arturia devices, DAW racks, etc.).
- `mastering`: shared across all songs, edited just once.

### Editorial accuracy

**Only the concept for track 05 (Another Day) comes from your provided description.** Its AI percentages / models / tools / lyrics are DEMO placeholders only. Track 03 also has example lyrics. All other songs have blank lyrics and blank percentage/model data. Replace fields with actual information and set `demo: false` before publishing.

## Asset hosting note

Browser media playback expects the audio file to be served with a supported audio MIME type, usually `audio/mpeg`. Some browsers won't play MP3s if the host or file path is incorrect. The page shows an inline error message instead of crashing.
