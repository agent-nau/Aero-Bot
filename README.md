# Security & Ticket Discord Bot

A multifunctional Discord bot built with discord.js v14 that provides moderation, utility, ticket, and verification features.

This README was updated to clarify setup, running, and runtime behaviors (keep-alive server, in-memory verification codes, and auto-assign). See implementation in [index.js](index.js) and [keep-alive.js](keep-alive.js).

Highlights
- Moderation: kick, ban, timeout, warn, warnings, clear, lockdown
- Utility: ping, help, serverinfo, say
- Ticket system: a setup stub
- Verification: modal + short-code flow (in-memory) using [`generateCode`](index.js), stored in [`verifCodes`](index.js), with settings in [`verifSettings`](index.js)
- Auto-assign on join: controlled by [`joinSettings`](index.js)
- In-memory warnings: [`warnings`](index.js)
- Keep-alive HTTP server: starts via [`startKeepAlive`](keep-alive.js)

Files
- [index.js](index.js) — main bot logic (commands, interactions, verification, auto-assign)
- [keep-alive.js](keep-alive.js) — tiny Express server to keep the process alive
- [package.json](package.json) — scripts & deps
- [LICENSE](LICENSE) — license text

Quickstart

Prerequisites
- Node.js 18+
- npm
- Discord bot token (and optionally a test GUILD_ID for fast command registration)

Setup
1. Install dependencies:
   - npm install

2. Create a .env file in the project root with:
   - DISCORD_BOT_TOKEN=your_bot_token
   - GUILD_ID=your_test_guild_id   # optional — if present, commands register to that guild only

Notes
- Commands register on startup using the bot token and optional GUILD_ID (see command registration in [index.js](index.js)).
- The bot starts a small HTTP server on port 3000 by calling [`startKeepAlive`](keep-alive.js). This can be used by uptime services or containers to verify liveness.
- Verification codes are ephemeral and stored in memory via [`verifCodes`](index.js). Restarting the bot clears them. For persistence, add a DB or file storage and replace the in-memory maps ([`verifSettings`](index.js), [`verifCodes`](index.js), [`joinSettings`](index.js), [`warnings`](index.js)).
- The code generator used for verification is [`generateCode`](index.js) (simple alphanumeric without confusing characters).

Running
- Start the bot:
  - npm start
  - or node index.js

Troubleshooting
- Slash commands not appearing?
  - If using GUILD_ID, ensure the ID is correct and the bot is in that guild.
  - Global commands may take up to an hour to propagate.
- Permissions:
  - Ensure the bot role has permissions such as Send Messages, Manage Channels, Manage Roles, Kick/Ban members, Manage Messages, Moderate Members depending on features used.
- Verification/ticket:
  - Verification uses a modal + short code flow. Codes expire after 5 minutes (see [`verifCodes`](index.js)).
  - Auto-assign uses [`joinSettings`](index.js) to store role and enabled flag in-memory.

Development notes
- Main maps: [`verifSettings`](index.js), [`verifCodes`](index.js), [`joinSettings`](index.js), [`warnings`](index.js)
- The keep-alive HTTP server is implemented in [keep-alive.js](keep-alive.js) and started from [index.js](index.js) via [`startKeepAlive`](keep-alive.js).
- For command registration the runtime calls REST with token from DISCORD_BOT_TOKEN; if you need offline deployment, implement a separate deploy script or adapt the code in [index.js](index.js).

License
- See [LICENSE](LICENSE)
