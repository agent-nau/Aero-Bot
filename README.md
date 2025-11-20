# Security & Ticket Discord Bot (Aero)

A multifunctional Discord bot built with discord.js v14 that provides moderation, utility, ticket and verification features, plus a configurable chatbot mode. This document describes detailed setup, configuration, command usage, internal behavior, and troubleshooting.

Table of contents
- Overview
- Features
- Requirements
- Installation
- Configuration (.env)
- Running the bot
- Command reference (detailed)
  - Moderation commands
  - Utility commands
    - /say
    - /embed
  - Chatbot commands & behavior
  - Ticket & verify (summary)
- Chatbot internals & limits
- Permissions & intents
- Persistence, scaling & security considerations
- Troubleshooting
- Development notes
- Contributing
- License

Overview
Aero is designed as a small, self-hostable moderation + utility bot with:
- Slash command-based moderation (kick, ban, timeout, warn, clear, lockdown)
- Utility commands: ping, serverinfo, help, say (plain text), embed (rich embed)
- A lightweight chatbot mode (mention to start; reply-to-bot to continue)
- Ticket & verification scaffolding
- In-memory storage for transient state (warnings, verification codes, chatbot settings)

Features (summary)
- Moderation: kick, ban, timeout (minutes), warn, view warnings, bulk clear messages
- Channel lockdown/unlock
- /say — send plain text as the bot
- /embed — send a rich embed with title, description, color, image, thumbnail, footer
- Chatbot — enable per-server and per-channel; mention @Aero to start; reply to bot messages to continue conversation
- Verification — modal & short-code flow (in-memory)
- Auto-role assignment on join (in-memory config)
- Keep-alive HTTP server for hosting environments

Requirements
- Node.js 18+ (LTS recommended)
- npm
- A Discord bot application and token
- Optional: OPENAI_API_KEY (for smarter chatbot replies via OpenAI chat completions)

Installation
1. Clone or download this repo to your Windows machine:
   - git clone https://your-repo-url.git
   - cd "c:\Users\megal\Downloads\Aero-Bot"

2. Install dependencies:
   - npm install

3. Create a .env in the project root (see Configuration below).

Configuration (.env)
Create a .env file with the following variables (example):
- DISCORD_BOT_TOKEN=your_bot_token_here
- GUILD_ID=optional_test_guild_id   # optional — speeds up command registration for a single guild
- OPENAI_API_KEY=your_openai_key    # optional — used to generate smarter chatbot responses

Notes:
- If GUILD_ID is set, slash commands register only for that guild on startup (instant). Without it commands register globally (can take up to 1 hour).
- OPENAI_API_KEY is optional. Without it, the chatbot falls back to a simple echo + hint message.

Running the bot
- Start:
  - npm start
  - or: node index.js

- The bot starts a small HTTP keep-alive server (port 3000 by default) via startKeepAlive() so you can use uptime tools if needed.

Command reference (detailed)

General
- All commands are slash commands and use Discord's ChatInput interactions.
- Many commands require elevated permissions (configured with setDefaultMemberPermissions).
- Examples show typical usages; when targeting a different channel mention it with the channel argument or use the current channel.

Moderation (brief)
- /kick user:@member reason:optional — requires Kick Members
- /ban user:@member reason:optional — requires Ban Members
- /timeout user:@member duration:<minutes> reason:optional — requires Moderate Members
- /warn user:@member reason:<string> — requires Moderate Members
- /warnings user:@member — list warnings
- /clear amount:<1-100> — bulk delete messages; requires Manage Messages
- /lockdown action:lock|unlock — flips SEND_MESSAGES for @everyone; requires Manage Channels

Utility commands

/say
- Purpose: Send plain text as the bot.
- Options:
  - message (string, required) — plain text content to send.
  - channel (channel, optional) — text channel to send to (GuildText only). If omitted, uses the invoking channel.
- Permissions: default requires Manage Messages (configurable).
- Behavior: The bot sends a plain message (no embed) to the target channel and replies to the command with an ephemeral confirmation.
- Example:
  - /say message:"Server maintenance in 10 minutes" channel:#announcements

/embed
- Purpose: Send a rich embed as the bot.
- Options:
  - description (string, required) — main embed text.
  - title (string, optional) — embed title.
  - color (string, optional) — hex color (e.g. #00ff00) or one of the supported names in colorMap (see colorMap below).
  - footer (string, optional) — footer text.
  - image (string, optional) — full image URL to show inside embed.
  - thumbnail (string, optional) — thumbnail URL.
  - channel (channel, optional) — target text channel.
- Permissions: default requires Manage Messages.
- Behavior: Builds and sends an EmbedBuilder embed. If color matches one of the friendly names (red, blue, green, ...), the bot maps it to a hex value. The bot replies ephemerally on success/failure.
- Example:
  - /embed description:"Rules updated" title:"Server Rules" color:"blue" footer:"Updated by Admin" channel:#rules

Supported color names (colorMap)
- red, blue, green, yellow, purple, orange, pink, black, white, gray, cyan, magenta
- These map to corresponding hex values in the code. Hex strings (e.g. "#ff0000") are accepted too.

Chatbot: enable, disable & behavior

Commands
- /chatbot set channel:#channel
  - Enables Aero chatbot in the specified channel for the current guild. After enabling, only the configured channel will respond to chatbot interactions.
- /chatbot off
  - Disables the chatbot for the server and clears the in-memory setting.

Behavior
- When enabled, the chatbot only operates in the configured channel.
- Start a conversation: Mention the bot directly in the configured channel:
  - Example: @Aero Hello, can you summarize the rules?
  - The bot strips the mention from the message, generates a reply and replies to the user's message. It stores a small conversation history tied to the bot's reply message ID.
- Continue a conversation: Reply to the bot's reply message (use Discord's reply feature). Only the original user who started the conversation in the same channel can continue that conversation thread.
  - This flow ensures private, linear conversations and prevents unrelated users from hijacking a convo.
- Conversation lifecycle:
  - Conversations are stored in memory keyed by the bot message ID. When the user replies to the bot's message, history is updated and the bot replies again; the convo is re-keyed to the new bot message ID.
  - History limit: the code keeps a bounded history (defaults to the most recent ~20 entries) to prevent unbounded memory usage.
- OpenAI integration:
  - If OPENAI_API_KEY is present, the bot uses OpenAI Chat Completions (gpt-3.5-turbo) to generate replies.
  - If no key is present the bot returns a small fallback message: "You said: <message>\n(Enable OPENAI_API_KEY to get smarter replies.)"

Chatbot examples
- Enable:
  - /chatbot set channel:#aero-chat
- Use:
  - User: @Aero What's the weather like?
  - Bot: (reply generated)
  - User (clicks reply on bot's reply): Also, any packing tips?
  - Bot: (continues the conversation using stored history)

Ticket & Verify (summary)
- /ticket setup channel:#panel category:#tickets — posts a ticket panel (stubbed).
- /verify setup channel:#verify verified_role:@role unverified_role:@role — posts a verification panel that uses a modal + short code pairing; codes expire in memory.
- These systems are implemented as in-memory examples. For production you should persist state (DB/file) and add rate-limits / audit logging.

Chatbot internals & limits
- convo map: stores conversation objects { userId, channelId, history: [{role,content}] } keyed by the bot's message ID.
- History trimming: history is trimmed when it grows beyond the configured size (default ~20).
- Resource usage: in-memory approach is simple but ephemeral; restarts clear conversations and settings stored only in memory maps:
  - chatSettings, convos, verifSettings, verifCodes, joinSettings, warnings
- OpenAI usage:
  - The current code calls the Chat Completions endpoint with model:gpt-3.5-turbo and max_tokens:300 by default. Monitor your API usage and implement rate limits/quotas as needed.

Permissions & Discord Gateway intents
- Recommended bot role permissions:
  - Send Messages, Embed Links, Read Message History, Use External Emojis (as needed)
  - Manage Channels, Manage Roles, Kick Members, Ban Members, Manage Messages, Moderate Members (for moderation features)
- Gateway intents used in index.js:
  - GatewayIntentBits.Guilds
  - GatewayIntentBits.GuildMembers
  - GatewayIntentBits.GuildMessages
  - GatewayIntentBits.MessageContent
- MessageContent intent is required for the chatbot to read message text. Enabling MessageContent requires checking Discord's developer policy and intent gating for larger bots.

Persistence, scaling & security considerations
- In-memory storage is not persisted. For production:
  - Use a database (SQLite, Postgres, Redis) to persist settings and active convos or to shard across multiple instances.
  - Persist verification codes, ticket metadata, warnings, and auto-assign settings.
  - Consider removing MessageContent intent and replacing mention-triggered flows with slash-command-based chatbot flows for privacy and scale.
- Secure environment:
  - Keep DISCORD_BOT_TOKEN and OPENAI_API_KEY out of source control.
  - Use environment variables or a secrets manager in production.
  - Validate and sanitize URLs used in embeds (image/thumbnail) before sending to avoid malicious content or XSS concerns in downstream UIs.
- Rate limits:
  - Discord and OpenAI enforce rate limits. Implement retry/backoff logic for production usage.

Troubleshooting
- Slash commands not registered or missing:
  - If using GUILD_ID ensure the bot is invited to that guild. Global registration can take up to 1 hour.
  - Check the bot's OAuth scope includes "applications.commands".
- Bot not responding to mentions:
  - Ensure /chatbot set was used and the current channel equals the configured channel.
  - Confirm Message Content intent is enabled in the bot application portal and in the Client configuration in index.js.
- OpenAI errors:
  - Check OPENAI_API_KEY and usage limits. The code logs response error status and body for debugging.
- Permissions errors when editing channel permissions (lockdown):
  - The bot requires Manage Channels permission and a role high enough to modify @everyone in the target channel.

Development notes
- Main in-memory maps (index.js):
  - warnings, colorMap, chatSettings, convos, verifSettings, verifCodes, joinSettings
- Keep-alive server:
  - Implemented in keep-alive.js and started via startKeepAlive() from index.js
- Command registration:
  - registerCommands() uses @discordjs/rest and the command builders. Use GUILD_ID for faster dev cycles.

Contributing
- Bug reports, issues, and pull requests are welcome. For major features (persistence, multi-instance support), open an issue first to discuss design.
- Keep changes small and add tests where possible.

Security & privacy
- The bot stores short-term data in memory only. Do not use this code for handling sensitive PII without adding encryption/persistence safeguards and audits.
- If you enable MessageContent, be aware of privacy and compliance concerns — avoid logging message content to public logs.

License
- See LICENSE file in this repository.

Appendix: Example commands
- Enable chatbot in a channel:
  - /chatbot set channel:#aero-chat
- Disable chatbot:
  - /chatbot off
- Send a plain message as the bot:
  - /say message:"Maintenance starts in 15 minutes" channel:#announcements
- Send a rich embed:
  - /embed description:"New rules applied" title:"Server Rules" color:"purple" footer:"Moderation team" channel:#rules

Contact / Support
- For issues with this code, open an issue in the repository or consult the project maintainer.
