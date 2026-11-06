# 🐦 Flappy Bird Clone

A polished, browser-based clone of the classic Flappy Bird game, built entirely with vanilla JavaScript and HTML5 Canvas. No external game engines or build tools required—just open and play.

**[▶️ Play Live](https://nguyenchivot-create.github.io/flappybird/)**

---

## ✨ Features

- **Smooth 60 FPS gameplay** with a fixed-timestep physics loop
- **Responsive canvas rendering** that adapts to any screen size (desktop, tablet, mobile)
- **Procedural pipe generation** with randomized gap positions
- **Full keyboard and touch support** — play with Space, Arrow Up, mouse clicks, or screen taps
- **Persistent local leaderboard** via `localStorage` with player names and dates
- **Medal system** — earn 🥉, 🥈, or 🥇 based on your score
- **Sound & music** — flap, score, hit and game-over effects plus a looping background track, with separate music/effects volume sliders and a mute toggle (all remembered in `localStorage`)
- **High-score tracking** saved across browser sessions
- **Clean, animated UI** with overlays for menu, game over, name entry, and leaderboard
- **Zero dependencies** — pure vanilla JS, HTML, and CSS

---

## 🎮 How to Play

### Controls

| Input | Action |
|-------|--------|
| `Space`, `↑` (Arrow Up), `Enter` | Flap / Start / Restart |
| `Escape` | Close leaderboard or name entry |
| `M` or 🔊 button | Mute / unmute all sound |
| 🎚️ button | Show music and effects volume sliders |
| Mouse click (left) | Flap / Start / Restart |
| Touch / Tap | Flap / Start / Restart |

### Objective

Navigate the bird through the gaps between green pipes without touching them or the ground. Each pipe passed earns **1 point**. Pipe speed and gap size stay constant for the whole run (both scale with screen size).

### Medals

| Score | Medal |
|-------|-------|
| 10–19 | 🥉 Bronze |
| 20–29 | 🥈 Silver |
| 30+   | 🥇 Gold |

---

## 🚀 Running Locally

There is no build step. Serve the folder with any static file server:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# Bun
bunx serve .
```

Then visit `http://localhost:8000`.

You can also double-click `index.html`, but browsers block loading files from `file://` pages, so the sound files in `public/sounds/` will not load: the game falls back to synthesized effects and there is no background music. Use a local server to hear the real sounds.

---

## 🌐 Deployment

The game is hosted on **GitHub Pages** from the `main` branch (root folder):

**https://nguyenchivot-create.github.io/flappybird/**

Every push to `main` redeploys it automatically within a minute or two. The empty `.nojekyll` file tells GitHub Pages to serve the files as-is.

It is a plain static site, so it can also be hosted anywhere else. A `vercel.json` is included for Vercel: it serves `index.html` at `/` and every other path as a static file.

---

## 🏗️ Architecture Overview

The game follows a modular, object-oriented architecture with a central game engine, entity managers, and a responsive rendering pipeline.

### Game Loop

A standard **fixed-timestep game loop** runs inside `requestAnimationFrame`:

1. `loop(now)` — called every frame via `requestAnimationFrame`.
2. `dt` (delta time) is accumulated.
3. `fixedUpdate(dt)` runs in discrete `1/60` second steps, keeping physics deterministic regardless of frame rate.
4. `render()` draws the current state to the canvas.

### State Machine

The game uses a finite set of states defined in `js/game.js`:

```
MENU        →  Title screen, floating bird animation
PLAYING     →  Active gameplay with physics and scoring
DEAD        →  Bird drops to the ground, game over screen with score summary
LEADERBOARD →  Overlay showing top scores
NAME_ENTRY  →  Modal to enter name for a new high score
```

Transitions are driven by player input or game events (collisions). `previousState` is stored when entering modal states so the game can cleanly return afterward.

### Module Breakdown

| Module | File | Responsibility |
|--------|------|----------------|
| **Game Engine** | `js/game.js` | State machine, main loop, physics scheduling, scoring, best-score persistence, canvas resizing |
| **Bird** | `js/bird.js` | Bird entity: gravity, flapping, rotation, collision radius, menu idle float, and vector-art rendering |
| **Pipe Manager** | `js/pipe.js` | Pipe pair spawning, gap randomization, off-screen culling, circle-rectangle collision detection, and pipe rendering |
| **Ground** | `js/ground.js` | Infinitely scrolling ground tiles with grass, dirt speckles, and tile seams |
| **Input** | `js/input.js` | Keyboard, mouse, and touch event handling; maps inputs to flap/start/restart/menu actions |
| **Leaderboard** | `js/leaderboard.js` | `localStorage` CRUD for scores, ranking, high-score checking, top-N retrieval |
| **Sound** | `js/audio.js` | Loads `public/sounds/*`, music/effects volume channels, mute + volume persistence, first-gesture unlock, anti-overlap limits, synthesized fallbacks |
| **Main / UI** | `js/main.js` | DOM overlay wiring, button handlers, name-entry modal, leaderboard rendering, HUD updates, canvas resize glue |

### Rendering Pipeline

Each frame the canvas is cleared and the following layers are drawn back-to-front:

1. **Sky** — a vertical CSS-like linear gradient (`#4facfe` → `#00f2fe`)
2. **Pipes** — all active pipe pairs, top and bottom with caps and shadows
3. **Ground** — scrolling dirt tile pattern with grass top
4. **Bird** — rotated, procedurally drawn vector bird (body, eye, beak, wing, tail)

The canvas uses `devicePixelRatio` scaling so lines and shapes stay crisp on high-DPI displays.

---

## ⚙️ Technical Details

### Physics Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `GRAVITY` | `1800` px/s² | Downward acceleration |
| `FLAP_VELOCITY` | `-550` px/s | Upward impulse on flap |
| `MAX_FALL_SPEED` | `900` px/s | Terminal velocity cap |
| `PIPE_SPEED_BASE` | `280` px/s | Horizontal scroll speed (scaled to canvas width) |
| `PIPE_SPAWN_INTERVAL` | `1.5` s | Time between new pipe pairs |
| `PIPE_WIDTH` | `~12%` of canvas width | Pipe thickness |
| `PIPE_GAP` | `25%` of canvas height (clamped 120–200 px) | Vertical gap between pipes |
| `BIRD_RADIUS` | `~2.5%` of min(width, height) | Collision circle radius |
| `GROUND_HEIGHT` | `~18%` of canvas height (max 140 px) | Height of the ground strip |

### Collision Detection

The bird is treated as a **circle**. Each pipe pair is two axis-aligned rectangles. Collision uses the **closest-point-on-rectangle-to-circle** algorithm:

1. Find the closest X on the pipe to the bird center.
2. Find the closest Y on the top or bottom pipe to the bird center.
3. If the distance from that point to the circle center is less than the bird radius, a collision is triggered.

Scoring occurs when the bird’s X position passes the right edge of a pipe pair.

### Responsive Design

- The canvas fills the full viewport (`100vw` × `100vh`).
- On `resize`, logical dimensions and all proportional constants (bird size, pipe width, gap, ground height, speed) are recalculated relative to the new canvas size.
- A `devicePixelRatio` multiplier ensures sharp rendering on Retina and mobile displays.
- CSS `touch-action: none` and `user-select: none` prevent scrolling and zoom gestures during play.

### Leaderboard Storage

- Scores are stored in `localStorage` under the key `flappy_bird_leaderboard`.
- The leaderboard keeps up to **50 entries**, sorted descending by score.
- When a run scores above 0 and makes the top 50, a name-entry modal appears.
- Entries include: `name`, `score`, and `date` (locale-formatted).
- The **Clear All** button in the leaderboard UI wipes the stored data after confirmation.

### Audio

| Event | File | Notes |
|-------|------|-------|
| Bird flaps | `public/sounds/flap.wav` | At most one every 70 ms, max 2 at once, so rapid tapping does not stack up |
| Pipe passed | `public/sounds/score.wav` | |
| Collision (pipe or ground) | `public/sounds/hit.wav` | |
| Game over | `public/sounds/die.wav` | Starts 0.25 s after the hit |
| Background | `public/sounds/background.mp3` | Loops forever; starts on the player's first tap, click or key press |

- Everything plays through the **Web Audio API** with three gain nodes: master (mute), music and effects. Web Audio is used instead of `<audio>` tags because iPhone Safari ignores `<audio>` volume, which would break the volume sliders.
- Browsers (Safari on iPhone in particular) block sound until the player interacts, so the audio engine is created on the first `touchend` / `pointerdown` / `keydown`. A silent buffer is played at that moment to fully unlock iOS.
- Audio pauses while the tab is hidden and resumes when it is visible again.
- Settings are saved in `localStorage` under `flappy_bird_audio` as `{ muted, musicVolume, sfxVolume }`.
- If a sound file is missing or fails to decode, that effect is synthesized in code instead, so the game is never silent. Missing music simply means no music.
- On iPhone, Web Audio follows the **ring/silent switch**: with the phone on silent, you will hear nothing.

### Replacing the Sounds

1. Put your own files in `public/sounds/` with **exactly the same names**: `flap.wav`, `score.wav`, `hit.wav`, `die.wav`, `background.mp3`.
2. Keep effects short (under ~1 s) and trim silence at the start so they feel instant. WAV or MP3 both work as long as the file name and extension match.
3. For seamless music, export the loop to an exact length (for example a whole number of bars). Leading encoder silence of up to 100 ms is skipped automatically.
4. To use different names or formats (e.g. `.ogg`), edit the paths in `SOUND_FILES` at the top of `js/audio.js`. Note that Safari on iPhone does not play `.ogg`; prefer `.mp3`, `.m4a` or `.wav`.
5. To change how often an effect may repeat, edit `SFX_LIMITS` in the same file.
6. Hard-refresh the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) because sound files are cached.

To get the original sounds back, run `python3 tools/generate_sounds.py` (needs Python 3; `ffmpeg` for the MP3).

**Where to find free sounds with a suitable license:** only use files whose license allows your use and follow any attribution it requires.

- [Kenney](https://kenney.nl/assets?q=audio) - game sound packs, CC0 (public domain)
- [OpenGameArt](https://opengameart.org/) - filter by CC0 or CC-BY
- [Freesound](https://freesound.org/) - filter by "Creative Commons 0"; CC-BY files need attribution
- [jsfxr](https://sfxr.me/) - make your own retro effects in the browser and export them as WAV

### Best Score

The personal best is stored separately in `localStorage` (`flappy_bird_best`) and updated immediately upon death if the current run exceeds it.

---

## 📁 Project Structure

```
flappybird/
├── index.html              # Game shell, canvas, and UI overlays
├── css/
│   └── style.css           # Layout, animations, panel styling, responsive rules
├── js/
│   ├── game.js             # Core engine: loop, states, physics scheduler
│   ├── bird.js             # Bird entity, flap physics, vector drawing
│   ├── pipe.js             # Pipe pairs, spawning, collision, rendering
│   ├── ground.js           # Scrolling tiled ground renderer
│   ├── input.js            # Keyboard, mouse, and touch input mapping
│   ├── leaderboard.js      # localStorage leaderboard logic
│   ├── audio.js            # Sound engine: music/effects channels, volumes, mute
│   └── main.js             # Entry point: DOM glue, UI handlers, resize
├── public/
│   └── sounds/             # flap.wav, score.wav, hit.wav, die.wav, background.mp3
├── tools/
│   └── generate_sounds.py  # Regenerates the original sound files
├── ARTICLE.md              # Write-up about building the game
├── publish_to_notion.py    # Publishes ARTICLE.md to Notion (needs NOTION_API_KEY)
├── vercel.json             # Vercel static-site routing config
├── .nojekyll               # Serve files as-is on GitHub Pages
└── README.md               # You are here
```

---

## 🙏 Credits

- **Original concept**: Dong Nguyen — *Flappy Bird* (2013)
- **Clone implementation**: Built with vanilla JavaScript, HTML5 Canvas, and CSS3
- **No external libraries** — all graphics are procedurally drawn via the Canvas 2D API
- **Sounds and music** are original, synthesized from scratch by `tools/generate_sounds.py`, so they carry no third-party copyright

---

## 📄 License

This project is provided as an open example. Feel free to fork, modify, and learn from it.
