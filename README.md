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