## 🛡️ Aero Security & Ticket Bot

**Aero** is a modular Discord bot designed for server safety, moderation, and automation. It combines essential admin tools with interactive systems for verification, ticketing, and role management — all powered by global slash commands.

---

### ✨ Features

#### 🛡️ Moderation Tools
- `/kick` — Remove a disruptive member
- `/ban` — Permanently ban a user
- `/timeout` — Temporarily mute a member
- `/warn` — Issue a warning (stored in memory)
- `/warnings` — View warnings for a user
- `/clear` — Bulk delete messages
- `/lockdown` — Lock or unlock a channel

#### 🔧 Utility Commands
- `/ping` — Check bot latency
- `/serverinfo` — Show server name, member count, and owner ID
- `/say` — Send a message as the bot
- `/embed` — Send a rich embed with custom options
- `/help` — View categorized command list

#### 🔒 Verification System
- `/verify setup` — Post a verification panel
- Users receive a short code and enter it via modal
- Roles are updated on success

#### 🎫 Ticket System
- `/ticket setup` — Post a ticket panel (ticket creation logic coming soon)

#### 🎉 Auto Role Assignment
- `/autojoin setup` — Enable auto-role on join
- `/autojoin off` — Disable auto-role

#### 🌍 Global Slash Commands
- Commands are registered globally and available in every server the bot joins

---

### 📜 License

This project is licensed under the **Apache License 2.0**.

You are free to:
- Use the code commercially
- Modify and distribute it
- Include it in proprietary projects

You must:
- Include a copy of the license
- State changes made to the code
- Not use trademarks or brand names without permission

For full license details, see [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

---
