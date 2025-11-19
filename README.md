# Security & Ticket Discord Bot

A multifunctional Discord bot built with discord.js v14 that provides:
- 🔒 Moderation tools (kick, ban, timeout, warn, warnings, clear, lockdown)
- 🛠 Utility commands (ping, help, serverinfo, say)
- 🎫 Ticket system (setup panel stub)
- ✅ Verification system (panel + modal code flow)

---

## ✨ Features

### Moderation
- `/kick @user [reason]` – Kick a member  
- `/ban @user [reason]` – Ban a member  
- `/timeout @user <minutes> [reason]` – Timeout a member  
- `/warn @user <reason>` – Warn a member  
- `/warnings @user` – Show warnings for a user  
- `/clear <amount>` – Bulk delete messages (1–100)  
- `/lockdown <lock|unlock>` – Lock or unlock the current channel  

### Utility
- `/ping` – Show bot latency  
- `/help` – List commands  
- `/serverinfo` – Show server info  
- `/say` – Send plain text or embed messages  

### Ticket System
- `/ticket setup` – Post a ticket panel (stub)

### Verification
- `/verify setup` – Post verification panel (channel + verified/unverified role options)  
- Verification uses a modal + short code flow and stores temporary codes in-memory.

---

## Quickstart

Prerequisites
- Node.js 18+ (recommended)
- npm (comes with Node.js)
- A Discord bot token and (optional) a test guild ID.

Setup
1. Open a terminal in the project directory (VS Code Terminal recommended).
2. Install dependencies:
   - Windows: npm install
3. Create a .env file (example contents):
   - DISCORD_BOT_TOKEN=your_bot_token
   - GUILD_ID=your_test_guild_id   # optional — when set, commands register to this guild only

Notes:
- The bot registers slash commands on startup using DISCORD_BOT_TOKEN and the optional GUILD_ID. If GUILD_ID is present, commands are registered to that guild (fast); otherwise they're registered globally (may take ~1 hour to propagate).
- CLIENT_ID is not required by the current index.js; the bot uses client.user.id when registering commands after login.

Start the bot
- npm start
- or node .\index.js

If you have a separate deploy-commands.js, you may still run:
- node .\deploy-commands.js --guild
- node .\deploy-commands.js --global

---

## Troubleshooting

Slash commands not appearing?
- If using GUILD_ID, ensure it's correct and the bot is in that guild. Guild commands update immediately.
- Global commands can take up to 1 hour to appear.
- Check the terminal logs — index.js logs registration success/failure.

Permissions
- For moderation and some utilities, the bot needs permissions such as Send Messages, Manage Channels, Manage Roles, Kick/Ban members, Manage Messages, Moderate Members. Ensure the bot role has them.

Verification/ticket issues
- Verification codes are stored in-memory; a restart clears them. For persistent behavior, add a DB or file storage.
- Ensure the channel/role IDs provided during setup are valid and the bot has Manage Roles / Send Messages in the target channel.

---

## Contributing
- Open an issue or PR with feature suggestions or bug fixes.

---

## License
MIT License
