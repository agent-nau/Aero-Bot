# Security & Ticket Discord Bot

A multifunctional Discord bot built with discord.js v14 that provides:
- 🔒 Moderation tools (kick, ban, timeout, warn, clear, lockdown)
- 🛠 Utility commands (ping, help, serverinfo, say)
- 🎫 Ticket system (setup panel stub)

---

## ✨ Features

### Moderation
- `/kick @user [reason]` – Kick a member
- `/ban @user [reason]` – Ban a member
- `/timeout @user <minutes> [reason]` – Timeout a member
- `/warn @user <reason>` – Warn a member
- `/warnings @user` – Show warnings
- `/clear <amount>` – Bulk delete messages
- `/lockdown <lock|unlock>` – Lock or unlock the current channel

### Utility
- `/ping` – Show bot latency
- `/help` – List commands
- `/serverinfo` – Show server info
- `/say` – Send plain text or embed messages

### Ticket System
- `/ticket setup` – Stub for posting a ticket panel (expandable)

---

## Quickstart

Prerequisites
- Node.js 18+ (recommended)
- npm (comes with Node.js)
- A Discord bot token, application ID, and your guild ID (for guild-scoped command deployment).

Setup
1. Clone or extract the repository to your machine.
2. Open a terminal in the project directory (VS Code Terminal recommended).
3. Install dependencies:
   - Windows: npm install
4. Create a .env file from the example:
   - copy `.env.example` to `.env`
   - set BOT_TOKEN=your_bot_token
   - set CLIENT_ID=your_client_id
   - set GUILD_ID=your_test_guild_id
   - set any other env variables the project uses

Register commands (if this repo has a command-deploy script)
- To register commands to a test guild (fast update): node ./deploy-commands.js --guild
- To register globally (may take up to an hour): node ./deploy-commands.js --global

Start the bot
- npm start
- or node .

---

## Troubleshooting

Slash commands not appearing after deploy?
- If you registered guild commands, invites you to the test server; global commands can take up to 1 hour to appear.
- Make sure CLIENT_ID and GUILD_ID in your environment are correct.
- Confirm the deploy script targets the right API scope (guild vs global).

Common permission issues
- Bot requires permissions like Send Messages, Manage Channels, Manage Roles (for some moderation commands). Ensure they are granted in the server invite.

---

## Contributing
- Open an issue or PR with feature suggestions or bug fixes.

---

## License
MIT License
