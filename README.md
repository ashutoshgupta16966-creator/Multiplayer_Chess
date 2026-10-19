# 👑 RajaChess — Gamified Multi-Player & Smart AI Chess Platform

> A feature-packed, gamified web chess application supporting 2-Player, 3-Player, and 4-Player variant modes powered by custom Smart AI, in-game economy, synthesized Web Audio, and real-time player analytics.

---

## ✨ Features

- ♟️ **Multi-Player Battlefield**:
  - **2-Player, 3-Player, & 4-Player Variants**: Play classic 2P chess or jump into chaotic 3-Player and 4-Player modes with 4 Kings on the same board.
  - **Local & AI Multiplayer**: Play against local friends or custom AI bots.

- 🤖 **Smart Multi-King AI Engine**:
  - Custom position evaluation algorithms tailored across 3 difficulty levels (**Basic**, **Intermediate**, **Advanced**).
  - Built-in **anti-loop endgame resolution** to prevent repetitive move locks.

- 🪙 **"Shahi Khazana" Virtual Economy**:
  - In-game points and rewards system stored securely via `localStorage`.
  - Win matches to earn **Gold Coins** and unlock exclusive **Board Themes**, **Piece Skins**, and **Custom Piece Shapes** in the store.

- 🎵 **Synthesized Web Audio Engine**:
  - Built using pure **JS Web Audio API** for instant move, capture, check, and victory sound effects.
  - **Zero external audio downloads**—lightweight, fast, and includes live mute toggles.

- 📊 **Player Analytics & Badge System**:
  - Real-time Stats Dashboard tracking **Win Rate %** and **Matches Played**.
  - Achievement Badges system (e.g., *"First Victory"*, *"Grand Monarch"*, *"Treasury Tycoon"*).

- ⚡ **Pure Vanilla Power**:
  - Built 100% using HTML5, CSS3, and ES6+ JavaScript with zero external frameworks for maximum performance.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)
- **Audio**: Web Audio API (Synthesized SFX without external audio files)
- **Storage**: `localStorage` API (Game state, gold coins, unlocked skins, player stats)

---

## 📂 Project Structure

```text
Multiplayer_Chess/
├── css/
│   └── styles.css        # Core game styling, store themes & responsive UI
├── js/
│   ├── board.js          # Board geometry, 2P/3P/4P state & move calculations
│   ├── main.js           # Game initialization & event handlers
│   ├── players.js        # Turn management, AI evaluation & stats tracking
│   ├── renderer.js       # Board graphics, piece skins & UI rendering
│   └── script.js         # Core application logic & Web Audio synthesizer
├── icon.png              # App icon
├── index.html            # Game viewport markup & UI modals
├── manifest.json         # Web App Manifest for PWA support
├── sw.js                 # Service Worker for offline play & asset caching
└── vercel.json           # Vercel deployment configuration
