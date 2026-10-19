# ♟️ Multiplayer Chess

> A responsive, interactive, and Progressive Web App (PWA) enabled online chess game built with modern vanilla JavaScript, custom CSS, and seamless Vercel deployment.

---

## ✨ Features

- 🎮 **Interactive Gameplay**: Real-time chess board rendering with move validation and state management.
- 📱 **PWA & Mobile Support**: Service worker support (`sw.js`) and web app manifest (`manifest.json`) for seamless mobile installation and offline usability.
- 🎨 **Modular Architecture**: Separate JavaScript modules for board representation, rendering logic, player handling, and game controls.
- 🚀 **Fast & Lightweight**: Pure HTML5, CSS3, and modern JavaScript without heavy dependencies.
- ⚡ **Vercel Ready**: Pre-configured `vercel.json` for effortless hosting and instant deployment.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)
- **Progressive Web App (PWA)**: Service Workers (`sw.js`), `manifest.json`
- **Deployment**: Vercel (`vercel.json`)

---

## 📂 Project Structure

```text
Multiplayer_Chess/
├── css/
│   └── styles.css        # Core stylesheet & layout designs
├── js/
│   ├── board.js          # Chess board state & move calculations
│   ├── main.js           # Main app initialization & event wiring
│   ├── players.js        # Player state & turn management
│   ├── renderer.js       # UI rendering & board graphics handler
│   └── script.js         # Core application scripts
├── .gitignore            # Git ignore rules
├── icon.png              # App icon for PWA
├── index.html            # Main HTML markup
├── manifest.json         # Web App Manifest for mobile/PWA
├── sw.js                 # Service Worker for offline support & caching
└── vercel.json           # Vercel deployment configuration
