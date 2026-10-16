# Sean O'Donovan Photography

## Ground rules (read first)

- **Do not remove or break anything on the existing site.** `index.html` must keep working exactly as it does now: planets, characters, walk-in photos, galleries, video, About.
- The only allowed change to `index.html` is adding one nav link to the demo (see below). All new work goes in new files.
- Work on a git branch (`worlds-demo`), not `main`. `main` is what GitHub Pages serves, so the live site stays untouched until Sean decides to merge.
- Explain changes in plain language. Sean is an EE student and a hobby web developer, not a full-time web dev.

## The existing site

A personal photography portfolio. One self-contained `index.html` (all HTML, CSS and JS inline, no libraries), hosted on GitHub Pages at https://seanodono.github.io (repo SeanODono/SeanODono.github.io). Photos live in `images/`.

**Concept:** the home screen is an 8-bit video game. Each photo collection is a planet you explore with a character, and the photos sit on the planet as framed tiles. Below the game are normal photo galleries, a video section and an About section.

### Planets (the `planets` array at the top of the script)
| Planet | Photos | Theme |
|---|---|---|
| Ireland (Landscape) | ireland1–19.jpg | emerald grass, stone-walled trails, castle + Stonehenge, sheep, bushes, rocks |
| USA (Landscape) | USA1–7.jpg | 5 biomes: red-rock canyon, sagebrush desert, beach + ocean, mountain lake, oak hills; asphalt roads with dashed yellow line |
| Wildlife | wild1–4.jpg | dark forest, pines, trees |
| Friends (band shows) | friends1–11.jpg | night planet, neon pink trails, concert stage, neon lamps |
| Open World | none | meadow with lakes, roam anywhere |

Each planet entry has `id, name, subtitle, color (glow), theme, photos[]`. Themes: meadow, ireland, usa, forest, night (defined in `THEMES`; trail styles in `TRAIL_STYLES`; pixel-art decorations in `DECOR`).

### How the game works
- Main planet is large; the others are small previews (planet + trails, no photos) in a column on the right (desktop) or a row at the bottom (phones). Clicking one swaps them: both planets stream along a shared ring (torus), carrying their photos and ground pixels.
- **Character:** sheep (default), car or pterodactyl, all 8-bit pixel art. The character stays at the front and the planet rolls under it. WASD / arrow keys, C or bottom-left button to switch character, joystick on phones.
- Sheep and car roam anywhere but water blocks them unless a road bridges it. The pterodactyl flies anywhere, can't enter photos, and the world zooms out a bit while flying.
- Photos on the planet are pixelated (32 px wide) with 8-bit gold frames, joined to winding trails by short side paths. Hover (0.5 s) or tap to enlarge at full resolution.
- Walking up a side path into a photo opens it big; you walk around on it and leave by walking off the edge, into a swirling portal, or Esc.
- The current planet's photos load first, then the others in the background. The page always opens at the top.

### Layout and settings
- Underlined menu links at top; white title band "SEAN O'DONOVAN · planet name · subtitle" plus a controls hint on desktop.
- Galleries per planet (2 columns on phones) with a lightbox. About: email sean@navonodo.com, Instagram @seen.through.sean.
- No settings panel. Settings are constants near the top of the script: CHARACTER, PLANET_SIZE 1.85, SPEED 1, CHARACTER_SIZE 0.85, PHOTO_PIXELS 32, GROUND "grass", TRANSITION_TIME 2000, TUBE_SIZE 0.1, HOVER_DELAY 500, MAIN_PATHS 3, PHOTO_GAP, PHOTO_SIZE, PATH_WIDTH, TRAIL_LOOSENESS 100, FLYING_ZOOM 0.8.

### Notes
- File names are case-sensitive on GitHub Pages (e.g. `USA1.jpg`). Photos should be ~2000–2500 px on the long side.
- Tested in Chrome. Sean may use Safari, which had a sheep-flicker issue fixed by putting the character inside the 3D scene.

## Current task: "Worlds" demo (local only)

**Goal:** a demo Sean can try on his own computer of a future multi-user version, where friends each have their own planet, add photos to it, customize it and their avatar, and visit each other's planets. It is a prototype to look at, not a real product yet.

### Where it lives
- A new page, e.g. `worlds.html` (plus any `worlds/*.js` / `worlds/*.css` files). Copy what's needed from `index.html` into the new files rather than refactoring `index.html`.
- Add one nav link "Worlds" to `index.html` that opens `worlds.html`. Nothing else in `index.html` changes.

### No real backend in the demo
- No accounts, servers or cloud services yet. Everything runs in the browser.
- Put all data access behind one small module (e.g. `worlds/data.js`) with functions like `listUsers()`, `getPlanet(userId)`, `savePlanet(planet)`, `addPhoto(userId, file)`, `getFriends(userId)`. The demo version stores data in the browser (IndexedDB for photos, since localStorage is too small). Later this module gets swapped for real API calls without touching the game code.
- Instead of login, a simple "Playing as: [user ▾]" switcher.
- Seed 3–4 made-up demo friends whose planets reuse Sean's existing photos in `images/`, so the demo looks alive on first load. Sean's own planet uses his real collections.

### Features to show
1. **Planets built from data:** a planet is generated from a saved description (name, subtitle, theme, glow color, ground palette, trail style, decorations, photo list) instead of the hardcoded array.
2. **Visit a friend:** a list of friends; picking one travels to their planet (reuse the ring transition). Small previews of friends' planets like the current side column.
3. **Add photos to your planet:** pick files; the browser resizes each to 1920×1080 max plus a small thumbnail (~480 px wide) and stores both. Tiles use the thumbnail; enlarging or walking in uses the full image. Only load the photos of the planet being visited.
4. **Customize your planet:** theme, glow color, ground colors, trail style, which decorations and how many. Live preview while editing.
5. **Customize your avatar:** sheep / car / pterodactyl plus color choices (recolor the existing pixel-art palettes).

### What's built so far (Friends tab)
- The site has two tabs: **Portfolio** (`index.html`, unchanged apart from a "Friends" menu link) and **Friends** (`worlds.html`). New work happens only in the Friends tab.
- Files: `worlds.html`, `worlds/game.js` (game engine copied from index.html + the Friends UI), `worlds/worlds.css`, `worlds/data.js` (all data access), `worlds/users/*.json` (seed users: sean, maya, theo, juno, ava; `index.json` lists them).
- A planet description is `{ name, subtitle, glow, trail, biomes: [{ type, size 1-5 }], decorations 0-3, photos }`. Biome types are in `BIOMES` in game.js (plains, forest, autumn, countryside, desert, canyon, mountain, beach, ocean, tundra, icy, neon); region sizes follow the size values.
- Panels: Friends (friend code, add by code, list, visit, remove), My photos (add: resized to 1920x1080 + 480 px thumb; delete), Customize my planet (name, subtitle, glow, trails, biomes + sizes, decoration amount; live preview, auto-save), and Reset demo.
- Demo storage: localStorage (`worlds-demo-state-v2`) for users/planets, IndexedDB (`worlds-demo`) for uploaded photos. Seeded from the JSON on first visit. Cloudflare replaces `data.js` later.

### Running it
Serve the folder locally (opening the file directly can break IndexedDB/modules), e.g. `python3 -m http.server 8000`, then open http://localhost:8000/worlds.html. Tell Sean the exact command.

## Later (not part of the demo)
If the demo works out, the plan for the real version is:
- **GitHub** holds the code; Cloudflare deploys from it.
- **Cloudflare Workers** for the backend API (login, uploads, saving planets, friends).
- **Cloudflare D1** for the database (users, planets, friends, photo lists).
- **Cloudflare R2** for photos and thumbnails (free egress).
- **"Sign in with Google"** handled in the Worker (no home-made password system).
- Security checks in the Worker: only you can edit your planet; privacy settings for who can visit.
- Possibly a phone version later as an installable web app.
At ~20 friends × 50 photos this should fit in Cloudflare's free tiers.
