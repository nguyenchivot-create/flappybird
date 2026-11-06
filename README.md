# 🐦 Flappy Bird Clone

A polished, browser-based clone of the classic Flappy Bird game, built entirely with vanilla JavaScript and HTML5 Canvas. No external game engines or build tools required—just open and play.

**[▶️ Play Live](https://trusty-rivulet-s3rn.here.now/)**

---

## ✨ Features

- **Smooth 60 FPS gameplay** with a fixed-timestep physics loop
- **Responsive canvas rendering** that adapts to any screen size (desktop, tablet, mobile)
- **Procedural pipe generation** with randomized gap positions
- **Full keyboard and touch support** — play with Space, Arrow Up, mouse clicks, or screen taps
- **Persistent local leaderboard** via `localStorage` with player names and dates
- **Medal system** — earn 🥉, 🥈, or 🥇 based on your score
- **Sound effects** for flap, score, hit, fall and medals, synthesized live with the Web Audio API (no audio files), with a mute toggle that is remembered
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
| `M` or 🔊 button | Toggle sound |
| Mouse click (left) | Flap / Start / Restart |
| Touch / Tap | Flap / Start / Restart |

### Objective

Navigate the bird through the gaps between green pipes without touching them or the ground. Each pipe passed earns **1 point**. The game speeds up subtly as you progress.

### Medals

| Score | Medal |
|-------|-------|
| 10–19 | 🥉 Bronze |
| 20–29 | 🥈 Silver |
| 30+   | 🥇 Gold |

---

## 🚀 Running Locally

No build step or server is required. Simply open the HTML file in any modern browser:

```bash
cd flappy-bird
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Or serve it with any static file server for the exact same experience:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# Bun
bunx serve .
```

Then visit `http://localhost:8000`.

---

## 🌐 Deployment

The game is deployed and playable at:

**https://trusty-rivulet-s3rn.here.now/**

It is configured as a static site. The `vercel.json` in the project root maps all routes to `index.html` for SPA-style hosting.

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
DEAD        →  Game over screen with score summary
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
- When a player achieves a score in the top 50, a name-entry modal appears.
- Entries include: `name`, `score`, and `date` (locale-formatted).
- The **Clear All** button in the leaderboard UI wipes the stored data after confirmation.

### Best Score

The personal best is stored separately in `localStorage` (`flappy_bird_best`) and updated immediately upon death if the current run exceeds it.

---

## 📁 Project Structure

```
flappy-bird/
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
│   └── main.js             # Entry point: DOM glue, UI handlers, resize
├── vercel.json             # Static-site routing config
└── README.md               # You are here
```

---

## 🙏 Credits

- **Original concept**: Dong Nguyen — *Flappy Bird* (2013)
- **Clone implementation**: Built with vanilla JavaScript, HTML5 Canvas, and CSS3
- **No external assets or libraries** — all graphics are procedurally drawn via the Canvas 2D API

---

## 📄 License

This project is provided as an open example. Feel free to fork, modify, and learn from it.
