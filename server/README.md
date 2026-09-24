# RajaChess Real-Time Game Server

A persistent Node.js + Express + Socket.io backend for RajaChess online multiplayer games.

## Features
- **Whitelist Room Creation**: Host creates room with 6-character room code; whitelist restricts entry strictly to invited friends' mobile numbers.
- **Color Assignment**: Host gets Gold (`red`). Joining players receive Sapphire (`yellow`), Emerald (`green`), and Ruby (`blue`) in order.
- **Reconnection Support**: Graceful re-connection using mobile number if disconnected.
- **Turn Order Validation & Move Sync**: Validates clockwise player turns and broadcasts moves to all clients.
- **Auto Cleanup**: Inactive and empty rooms are cleaned up after 30 minutes.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start Server
```bash
npm start
```
Server runs on `http://localhost:3001`.

### 3. Run Integration Tests
```bash
node test_server.js
```

---

## 🌐 Deploy to Render (Persistent Web Service)

Since Vercel serverless functions cannot maintain persistent WebSocket connections, this server runs as a Web Service on Render:

1. Push your repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) -> **New** -> **Web Service**.
3. Connect your repository `Multiplayer_Chess`.
4. Configure settings:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free
5. Add Environment Variables:
   - `PORT`: `10000` (or leave default assigned by Render)
   - `CORS_ORIGIN`: `https://multiplayer-chess-eta.vercel.app`
6. Click **Deploy Web Service**.
7. Copy your Render URL (e.g. `https://rajachess-server.onrender.com`).
8. In the frontend or in localStorage/config, set `SOCKET_SERVER_URL` to your Render URL.
