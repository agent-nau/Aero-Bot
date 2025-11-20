import {
  Client,
  GatewayIntentBits,
  ActivityType,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { startKeepAlive } from "./keep-alive.js";

console.log("🛡️ Starting Security & Ticket Bot...");
startKeepAlive();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const warnings = new Map();
const colorMap = {
  red: "#ff0000", blue: "#0000ff", green: "#00ff00", yellow: "#ffff00",
  purple: "#800080", orange: "#ffa500", pink: "#ffc0cb", black: "#000000",
  white: "#ffffff", gray: "#808080", cyan: "#00ffff", magenta: "#ff00ff",
};



// verification maps (guild settings + per-user codes)
const verifSettings = new Map(); // guildId -> { channelId, verifiedRoleId, unverifiedRoleId }
const verifCodes = new Map(); // userId -> { code, expiresAt, guildId }

// auto-assign on join settings
const joinSettings = new Map(); // guildId -> { roleId, enabled }

// chatbot settings
const chatSettings = new Map(); // guildId -> { channelId, enabled }
const convos = new Map(); // messageId -> { userId, channelId, history }

// simple code generator (no confusing characters)
function generateCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ---------- Slash commands ----------
const commands = [
  new SlashCommandBuilder().setName("kick").setDescription("Kick a member")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder().setName("ban").setDescription("Ban a member")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder().setName("timeout").setDescription("Timeout a member")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("duration").setDescription("Minutes").setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(o => o.setName("reason").setDescription("Reason"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName("warn").setDescription("Warn a member")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName("warnings").setDescription("Show warnings")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName("clear").setDescription("Bulk delete messages")
    .addIntegerOption(o => o.setName("amount").setDescription("1–100").setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder().setName("lockdown").setDescription("Lock or unlock this channel")
    .addStringOption(o => o.setName("action").setDescription("lock/unlock").setRequired(true).addChoices(
      { name: "Lock", value: "lock" }, { name: "Unlock", value: "unlock" }
    ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder().setName("serverinfo").setDescription("Server info"),

  new SlashCommandBuilder().setName("help").setDescription("Command list"),

  new SlashCommandBuilder().setName("ping").setDescription("Ping"),

  new SlashCommandBuilder().setName("say").setDescription("Say something as bot")
    .addStringOption(o => o.setName("message").setDescription("Message").setRequired(true))
    .addChannelOption(o => o.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder().setName("embed").setDescription("Send an embed as the bot")
    .addStringOption(o => o.setName("description").setDescription("Embed description").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("Embed title"))
    .addStringOption(o => o.setName("color").setDescription("Embed color"))
    .addStringOption(o => o.setName("footer").setDescription("Embed footer"))
    .addStringOption(o => o.setName("image").setDescription("Embed image URL"))
    .addStringOption(o => o.setName("thumbnail").setDescription("Embed thumbnail URL"))
    .addChannelOption(o => o.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),



  new SlashCommandBuilder().setName("ticket").setDescription("Ticket system")
    .addSubcommand(sub => sub.setName("setup").setDescription("Post ticket panel")
      .addChannelOption(o => o.setName("channel").setDescription("Panel channel").setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName("category").setDescription("Ticket category").setRequired(true).addChannelTypes(ChannelType.GuildCategory))
    ),

  new SlashCommandBuilder().setName("verify").setDescription("Verification system")
    .addSubcommand(sub => sub.setName("setup").setDescription("Post verification panel")
      .addChannelOption(o => o.setName("channel").setDescription("Panel channel").setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addRoleOption(o => o.setName("verified_role").setDescription("Role to add on success").setRequired(true))
      .addRoleOption(o => o.setName("unverified_role").setDescription("Role to remove on success").setRequired(true))
    ),

  new SlashCommandBuilder().setName("autojoin").setDescription("Auto-assign a role when users join")
    .addSubcommand(sub => sub.setName("setup").setDescription("Enable auto-assign and choose role")
      .addRoleOption(o => o.setName("role").setDescription("Role to assign on join").setRequired(true)))
    .addSubcommand(sub => sub.setName("off").setDescription("Disable auto-assign"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder().setName("chatbot").setDescription("Chatbot system")
    .addSubcommand(sub => sub.setName("set").setDescription("Enable chatbot and set channel")
      .addChannelOption(o => o.setName("channel").setDescription("Channel for chatbot").setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub => sub.setName("off").setDescription("Disable chatbot"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
];

// ---------- Command registration ----------
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    const body = commands.map(c => c.toJSON());
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body });
      console.log("✅ Commands registered in guild");
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body });
      console.log("🌍 Global commands registered");
    }
  } catch (e) {
    console.error("❌ Command registration error:", e);
  }
}

// ---------- Ready ----------
client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();

  const statuses = [
    { name: "Made by Lecs @ Vecs Corp.", type: ActivityType.Playing },
    { name: "for spam and raids", type: ActivityType.Watching },
    { name: "/help for commands", type: ActivityType.Listening },
  ];

  let i = 0;
  setInterval(() => {
    client.user.setPresence({ activities: [statuses[i]], status: "idle" });
    i = (i + 1) % statuses.length;
  }, 15000);
});

// ---------- INTERACTION HANDLER (FIXED, SINGLE INSTANCE) ----------
client.on("interactionCreate", async i => {
  try {
    // Handle ChatInput commands
    if (i.isChatInputCommand()) {
      const cmd = i.commandName;

      // /ping
      if (cmd === "ping") return await i.reply(`🏓 Pong! ${client.ws.ping}ms`);

      // /help
      if (cmd === "help") {
        return await i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("📖 Commands")
              .addFields(
                { name: "Moderation", value: "`kick`, `ban`, `timeout`, `warn`, `warnings`, `clear`, `lockdown`" },
                { name: "Utility", value: "`ping`, `help`, `serverinfo`, `say`, `embed`" },
                { name: "Tickets", value: "`ticket setup`" },
                { name: "Verification", value: "`verify setup`" },
                { name: "Auto-Assign", value: "`autojoin setup`, `autojoin off`" },
                { name: "Chatbot", value: "`chatbot set`, `chatbot off`" }
              )
              .setColor("#00bfff")
          ],
          flags: 64
        });
      }

      // /serverinfo
      if (cmd === "serverinfo") {
        return await i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("📊 Server Info")
              .addFields(
                { name: "Name", value: i.guild.name, inline: true },
                { name: "Members", value: `${i.guild.memberCount}`, inline: true },
                { name: "Owner ID", value: i.guild.ownerId, inline: true }
              )
              .setColor("#00bfff")
          ]
        });
      }

      // /kick
      if (cmd === "kick") {
        const user = i.options.getUser("user");
        const reason = i.options.getString("reason") || "No reason provided";

        try {
          const member = await i.guild.members.fetch(user.id);
          await member.kick(reason);
          return await i.reply(`✅ Kicked **${user.tag}**`);
        } catch {
          return await i.reply({ content: `❌ Unable to kick ${user.tag}`, flags: 64 });
        }
      }

      // /ban
      if (cmd === "ban") {
        const user = i.options.getUser("user");
        const reason = i.options.getString("reason") || "No reason provided";

        try {
          await i.guild.members.ban(user.id, { reason });
          return await i.reply(`✅ Banned **${user.tag}**`);
        } catch {
          return await i.reply({ content: `❌ Unable to ban ${user.tag}`, flags: 64 });
        }
      }

      // /timeout
      if (cmd === "timeout") {
        const user = i.options.getUser("user");
        const duration = i.options.getInteger("duration");
        const reason = i.options.getString("reason") || "No reason provided";

        try {
          const m = await i.guild.members.fetch(user.id);
          await m.timeout(duration * 60000, reason);
          return await i.reply(`⏳ Timed out **${user.tag}** for ${duration} minutes.`);
        } catch {
          return await i.reply({ content: `❌ Failed to timeout ${user.tag}`, flags: 64 });
        }
      }

      // /warn
      if (cmd === "warn") {
        const user = i.options.getUser("user");
        const reason = i.options.getString("reason");

        if (!warnings.has(user.id)) warnings.set(user.id, []);
        warnings.get(user.id).push(reason);

        return await i.reply(`⚠️ Warned **${user.tag}**: ${reason}`);
      }

      // /warnings
      if (cmd === "warnings") {
        const user = i.options.getUser("user");
        const list = warnings.get(user.id) || [];

        if (list.length === 0) return await i.reply(`${user.tag} has no warnings.`);

        return await i.reply(`⚠️ Warnings for **${user.tag}**:\n- ${list.join("\n- ")}`);
      }

      // /clear
      if (cmd === "clear") {
        const amount = i.options.getInteger("amount");
        try {
          await i.channel.bulkDelete(amount, true);
          return await i.reply({ content: `🧹 Deleted ${amount} messages`, flags: 64 });
        } catch {
          return await i.reply({ content: "❌ Cannot delete messages", flags: 64 });
        }
      }

      // /lockdown
      if (cmd === "lockdown") {
        const action = i.options.getString("action");
        const locked = action === "lock";

        try {
          await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, {
            SendMessages: !locked
          });

          return await i.reply(`🔒 Channel **${locked ? "locked" : "unlocked"}**.`);
        } catch {
          return await i.reply({ content: "❌ Failed to modify permissions", flags: 64 });
        }
      }

      // /say (plain text)
      if (cmd === "say") {
        const msg = i.options.getString("message");
        const target = i.options.getChannel("channel") || i.channel;

        try {
          await target.send({ content: msg });
          return await i.reply({ content: "✅ Sent!", flags: 64 });
        } catch {
          return await i.reply({ content: "❌ Failed to send message", flags: 64 });
        }
      }

      // /embed (rich embed)
      if (cmd === "embed") {
        const description = i.options.getString("description");
        const title = i.options.getString("title");
        let color = i.options.getString("color");
        const footer = i.options.getString("footer");
        const image = i.options.getString("image");
        const thumb = i.options.getString("thumbnail");
        const target = i.options.getChannel("channel") || i.channel;

        const embed = new EmbedBuilder().setDescription(description);
        if (title) embed.setTitle(title);
        if (color) color = colorMap[color.toLowerCase()] || color;
        if (color) embed.setColor(color);
        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (thumb) embed.setThumbnail(thumb);

        try {
          await target.send({ embeds: [embed] });
          return await i.reply({ content: "✅ Embed sent!", flags: 64 });
        } catch {
          return await i.reply({ content: "❌ Failed to send embed", flags: 64 });
        }
      }

      // /ticket setup
      if (cmd === "ticket") {
        if (i.options.getSubcommand() === "setup") {
          return await i.reply({
            content: "🎫 Ticket panel setup coming soon!",
            flags: 64
          });
        }
      }

      // /verify setup
      if (cmd === "verify") {
        if (i.options.getSubcommand() === "setup") {
          const channel = i.options.getChannel("channel");
          const verifiedRole = i.options.getRole("verified_role");
          const unverifiedRole = i.options.getRole("unverified_role");

          // save settings in memory
          verifSettings.set(i.guild.id, {
            channelId: channel.id,
            verifiedRoleId: verifiedRole.id,
            unverifiedRoleId: unverifiedRole.id,
          });

          const embed = new EmbedBuilder();
          embed.setTitle("🔒 Verification");
          embed.setDescription("Press the button to begin verification. You will get a short code to enter (e.g., L3q9xd).");
          embed.setColor("#00ff66");
  
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`verif_start_${i.guild.id}`).setLabel("Verify").setStyle(ButtonStyle.Primary)
          );
  
          await channel.send({ embeds: [embed], components: [row] });
          return await i.reply({ content: "✅ Verification panel posted.", flags: 64 });
        }
      }

      // /autojoin
      if (cmd === "autojoin") {
        if (i.options.getSubcommand() === "setup") {
          const role = i.options.getRole("role");
          joinSettings.set(i.guild.id, { roleId: role.id, enabled: true });
          return await i.reply({ content: `✅ Auto-assign enabled. Users who join will receive the **${role.name}** role.`, flags: 64 });
        } else { // off
          joinSettings.delete(i.guild.id);
          return await i.reply({ content: "✅ Auto-assign disabled for this server.", flags: 64 });
        }
      }

      // /chatbot
      if (cmd === "chatbot") {
        if (i.options.getSubcommand() === "set") {
          const channel = i.options.getChannel("channel");
          chatSettings.set(i.guild.id, { channelId: channel.id, enabled: true });
          return await i.reply({ content: `✅ Chatbot enabled in **${channel.name}**. Mention the bot or reply to its messages to chat.`, flags: 64 });
        } else { // off
          chatSettings.delete(i.guild.id);
          return await i.reply({ content: "✅ Chatbot disabled for this server.", flags: 64 });
        }
      }



    }

    // Handle button interactions for starting verification + opening modal
    if (i.isButton()) {
      // start verification button from panel
      if (i.customId && i.customId.startsWith("verif_start_")) {
        const parts = i.customId.split("_");
        const guildId = parts.slice(2).join("_") || i.guildId;
        const settings = verifSettings.get(guildId);

        if (!settings) {
          return await i.reply({ content: "❌ This verification panel is not properly configured.", flags: 64 });
        }

        // generate code and store
        const code = generateCode(6);
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        verifCodes.set(i.user.id, { code, expiresAt, guildId });

        // ephemeral message showing code and button to open modal
        const embed = new EmbedBuilder()
          .setTitle("🧩 Verification Code")
          .setDescription(`Your verification code: ||${code}||\n\nClick "Enter Code" to submit the code. The code expires in 5 minutes.`)
          .setColor("#ffd700");

        const openModalButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`verif_modal_open_${i.user.id}`).setLabel("Enter Code").setStyle(ButtonStyle.Success)
        );

        return await i.reply({ embeds: [embed], components: [openModalButton], flags: 64 });
      }

      // open modal for a specific user - ensures only the user who started can open
      if (i.customId && i.customId.startsWith("verif_modal_open_")) {
        const parts = i.customId.split("_");
        const userId = parts.slice(3).join("_");

        if (i.user.id !== userId) {
          return await i.reply({ content: "❌ You cannot open this modal for another user.", flags: 64 });
        }

        // create modal
        const modal = new ModalBuilder()
          .setCustomId(`verif_modal_${userId}`)
          .setTitle("Enter Verification Code");

        const input = new TextInputBuilder()
          .setCustomId("code_input")
          .setLabel("Type the code shown to you")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(8);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        return await i.showModal(modal);
      }
    }

    // Handle modal submit for verification code
    if (i.isModalSubmit()) {
      if (i.customId && i.customId.startsWith("verif_modal_")) {
        const parts = i.customId.split("_");
        const userId = parts.slice(2).join("_");

        if (i.user.id !== userId) {
          return await i.reply({ content: "❌ Unauthorized modal submission.", flags: 64 });
        }

        const entry = verifCodes.get(i.user.id);
        if (!entry) {
          return await i.reply({ content: "❌ No verification started or code expired.", flags: 64 });
        }

        if (Date.now() > entry.expiresAt) {
          verifCodes.delete(i.user.id);
          return await i.reply({ content: "❌ Code expired. Please try again.", flags: 64 });
        }

        const value = i.fields.getTextInputValue("code_input").trim();
        if (value !== entry.code) {
          return await i.reply({ content: "❌ Incorrect code. Please try again.", flags: 64 });
        }

        // successful verification
        const settings = verifSettings.get(entry.guildId);
        if (!settings) {
          return await i.reply({ content: "❌ Guild verification settings no longer exist.", flags: 64 });
        }

        try {
          const member = await i.guild.members.fetch(i.user.id);
          await member.roles.add(settings.verifiedRoleId);
          try {
            await member.roles.remove(settings.unverifiedRoleId);
          } catch {
            // remove may fail if user doesn't have role or bot lacks perms - ignore
          }
          verifCodes.delete(i.user.id);

          return await i.reply({ content: "✅ Verification successful! Roles updated.", flags: 64 });
        } catch (err) {
          console.error("Verification role update error:", err);
          return await i.reply({ content: "❌ Failed to update roles. Check bot permissions.", flags: 64 });
        }
      }
    }
  } catch (e) {
    console.error(e);
    try {
      if (i.replied || i.deferred) {
        return await i.followUp({ content: "❌ Error occurred.", flags: 64 });
      }
      return await i.reply({ content: "❌ Error occurred.", flags: 64 });
    } catch (err) {
      console.error("Failed to notify user about error:", err);
    }
  }
});

// ---------- Auto-assign role on join ----------
client.on("guildMemberAdd", async member => {
  try {
    const s = joinSettings.get(member.guild.id);
    if (!s || !s.enabled) return;
    const role = member.guild.roles.cache.get(s.roleId);
    if (!role) return console.warn(`Auto-assign role not found in guild ${member.guild.id}`);
    await member.roles.add(role);
    console.log(`Auto-assigned role ${role.name} to ${member.user.tag}`);
  } catch (err) {
    console.error("Auto-assign error:", err);
  }
});



// Message handler for mentions and reply-to-bot continuation
client.on("messageCreate", async message => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const settings = chatSettings.get(message.guild.id);
    if (!settings || !settings.enabled) return; // chatbot disabled for guild

    // only operate in the configured channel
    if (settings.channelId && message.channel.id !== settings.channelId) {
      // allow direct mention in any channel? the user asked "add @aero if mention the bot it will like a chatbot"
      // but requirement also requested command to set channel that chatbot only works; we enforce channel.
      return;
    }

    // If message mentions the bot -> start a conversation thread: bot replies and instructs to reply to continue
    if (message.mentions.has(client.user)) {
      // prepare initial context
      const prompt = message.content.replace(/<@!?(\d+)>/g, "").trim() || "Hello!";
      const initialHistory = [{ role: "user", content: prompt }];

      // send initial reply
      const initialText = await generateReply(prompt, initialHistory);
      const reply = await message.reply({ content: initialText });

      // store conversation keyed by bot reply id so user can reply to it to continue
      convos.set(reply.id, { userId: message.author.id, channelId: message.channel.id, history: initialHistory.concat([{ role: "assistant", content: initialText }]) });

      return;
    }

    // If the user replied to a bot message that started a convo -> continue
    const ref = message.reference?.messageId;
    if (ref && convos.has(ref)) {
      const convo = convos.get(ref);
      // ensure same user and same channel
      if (convo.userId !== message.author.id || convo.channelId !== message.channel.id) return;

      // append user message to history and generate reply
      convo.history.push({ role: "user", content: message.content });
      // indicate typing
      try { await message.channel.sendTyping(); } catch {}
      const replyText = await generateReply(message.content, convo.history);
      const sent = await message.reply({ content: replyText });

      // append assistant reply to history and update convos key to new bot message so next reply to this bot message continues
      convo.history.push({ role: "assistant", content: replyText });
      convos.delete(ref);
      convos.set(sent.id, convo);

      // optionally limit stored history length to avoid runaway memory
      if (convo.history.length > 20) convo.history.splice(0, convo.history.length - 20);

      return;
    }
  } catch (err) {
    console.error("Chatbot message handler error:", err);
  }
});

// Simple helper: generate reply via OpenAI if API key available, otherwise fallback
async function generateReply(userMessage, history = []) {
  // Use Puter.js only. No OpenAI/ChatGPT fallback.
  if (process.env.USE_PUTER === "1") {
    try {
      const puter = await import("puter");
      // Common possible Puter.js shapes — adapt if your Puter API differs.
      if (puter?.chat) {
        const r = await puter.chat({ prompt: userMessage, history, maxTokens: 300, temperature: 0.5 });
        const text = typeof r === "string" ? r : (r?.text || r?.output || "");
        if (text) return text.trim();
      } else if (puter?.generate) {
        const prompt = `${history.map(h => `${h.role}: ${h.content}`).join("\n")}\nUser: ${userMessage}`;
        const r = await puter.generate({ prompt, maxTokens: 300, temperature: 0.5 });
        const text = r?.text || r?.output || (Array.isArray(r) ? r[0]?.text : "");
        if (text) return text.trim();
      } else {
        console.warn("Puter.js loaded but API shape is unknown. Adapt generateReply to the Puter API.");
      }
    } catch (err) {
      console.error("Puter.js load/use error:", err);
    }
  }

  // If Puter not enabled/available, fallback to a short local echo/hint.
  return `You said: ${userMessage}\n(Install Puter.js and set USE_PUTER=1 to enable the local AI.)`;
}

// ---------- Login ----------
client.login(process.env.DISCORD_BOT_TOKEN);
