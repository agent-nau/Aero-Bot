# Security & Ticket Discord Bot

A multifunctional Discord bot built with [discord.js v14](https://discord.js.org/) that provides:
- 🔒 Moderation tools (kick, ban, timeout, warn, clear, lockdown)
- 🛠 Utility commands (ping, help, serverinfo, say)
- 🎫 Ticket system (setup panel stub)
- 🔗 URL bypass command using [bypass.vip](https://bypass.vip)

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
- `/bypass <url>` – Bypass shortened/ad links via bypass.vip API

### Ticket System
- `/ticket setup` – Stub for posting a ticket panel (expandable)

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- A Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)

### Installation
```bash
git clone <your-repo-url>
cd <project-folder>
npm install


Environment Variables

Create a .env file in the project root:

DISCORD_BOT_TOKEN=your-bot-token-here
GUILD_ID=optional-guild-id-for-dev


Run the Bot

node index.js


---

📖 Usage

Invite the bot to your server with the proper permissions:

• Manage Messages
• Kick Members
• Ban Members
• Moderate Members
• Manage Channels


Then use slash commands directly in Discord:

/kick @user Spamming
/ban @user Breaking rules
/timeout @user 30 Being rude
/warn @user Offensive language
/warnings @user
/clear 50
/lockdown lock
/say format:embed message:"Hello!" title:"Notice" color:red
/bypass https://linkvertise.com/example


---

🛡️ Notes

• The /bypass command uses the public bypass.vip API.
• Ticket system is currently a stub — you can expand it with buttons and channel creation.
• Presence rotates every 15 seconds to show helpful statuses.


---

📜 License

MIT License – free to use and modify.


---

This README gives you a polished overview of your bot. Do you want me to also add a **command table** (like a cheat sheet) so your audience can quickly see all commands and their descriptions at a glance?