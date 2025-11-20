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
import fetch from "node-fetch";
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
    .addStringOption(o => o.setName("format").setDescription("plain/embed").setRequired(true).addChoices(
      { name: "Plain Text", value: "plain" }, { name: "Embed", value: "embed" }
    ))
    .addStringOption(o => o.setName("message").setDescription("Message").setRequired(true))
    .addChannelOption(o => o.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText))
    .addStringOption(o => o.setName("title").setDescription("Embed title"))
    .addStringOption(o => o.setName("color").setDescription("Embed color"))
    .addStringOption(o => o.setName("footer").setDescription("Embed footer"))
    .addStringOption(o => o.setName("image").setDescription("Embed image URL"))
    .addStringOption(o => o.setName("thumbnail").setDescription("Embed thumbnail URL"))
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
    )
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
client.once("ready", async () => {
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
      if (cmd === "ping") return i.reply(`🏓 Pong! ${client.ws.ping}ms`);

      // /help
      if (cmd === "help") {
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("📖 Commands")
              .addFields(
                { name: "Moderation", value: "`kick`, `ban`, `timeout`, `warn`, `warnings`, `clear`, `lockdown`" },
                { name: "Utility", value: "`ping`, `help`, `serverinfo`, `say`" },
                { name: "Tickets", value: "`ticket setup`" }
              )
              .setColor("#00bfff")
          ],
          ephemeral: true
        });
      }

      // /serverinfo
      if (cmd === "serverinfo") {
        return i.reply({
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
          return i.reply(`✅ Kicked **${user.tag}**`);
        } catch {
          return i.reply({ content: `❌ Unable to kick ${user.tag}`, ephemeral: true });
        }
      }

      // /ban
      if (cmd === "ban") {
        const user = i.options.getUser("user");
        const reason = i.options.getString("reason") || "No reason provided";

        try {
          await i.guild.members.ban(user.id, { reason });
          return i.reply(`✅ Banned **${user.tag}**`);
        } catch {
          return i.reply({ content: `❌ Unable to ban ${user.tag}`, ephemeral: true });
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
          return i.reply(`⏳ Timed out **${user.tag}** for ${duration} minutes.`);
        } catch {
          return i.reply({ content: `❌ Failed to timeout ${user.tag}`, ephemeral: true });
        }
      }

      // /warn
      if (cmd === "warn") {
        const user = i.options.getUser("user");
        const reason = i.options.getString("reason");

        if (!warnings.has(user.id)) warnings.set(user.id, []);
        warnings.get(user.id).push(reason);

        return i.reply(`⚠️ Warned **${user.tag}**: ${reason}`);
      }

      // /warnings
      if (cmd === "warnings") {
        const user = i.options.getUser("user");
        const list = warnings.get(user.id) || [];

        if (list.length === 0) return i.reply(`${user.tag} has no warnings.`);

        return i.reply(`⚠️ Warnings for **${user.tag}**:\n- ${list.join("\n- ")}`);
      }

      // /clear
      if (cmd === "clear") {
        const amount = i.options.getInteger("amount");
        try {
          await i.channel.bulkDelete(amount, true);
          return i.reply({ content: `🧹 Deleted ${amount} messages`, ephemeral: true });
        } catch {
          return i.reply({ content: "❌ Cannot delete messages", ephemeral: true });
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

          return i.reply(`🔒 Channel **${locked ? "locked" : "unlocked"}**.`);
        } catch {
          return i.reply({ content: "❌ Failed to modify permissions", ephemeral: true });
        }
      }

      // /say
      if (cmd === "say") {
        const format = i.options.getString("format");
        const msg = i.options.getString("message");
        const target = i.options.getChannel("channel") || i.channel;

        if (format === "plain") {
          await target.send(msg);
          return i.reply({ content: "✅ Sent!", ephemeral: true });
        }

        const embed = new EmbedBuilder().setDescription(msg);
        const title = i.options.getString("title");
        let color = i.options.getString("color");
        const footer = i.options.getString("footer");
        const image = i.options.getString("image");
        const thumb = i.options.getString("thumbnail");

        if (color) {
          color = colorMap[color.toLowerCase()] || color;
        }

        if (title) embed.setTitle(title);
        if (color) embed.setColor(color);
        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (thumb) embed.setThumbnail(thumb);

        await target.send({ embeds: [embed] });
        return i.reply({ content: "✅ Embed sent!", ephemeral: true });
      }

      // /ticket setup
      if (cmd === "ticket") {
        if (i.options.getSubcommand() === "setup") {
          return i.reply({
            content: "🎫 Ticket panel setup coming soon!",
            ephemeral: true
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

          const embed = new EmbedBuilder()
            .setTitle("🔒 Verification")
            .setDescription("Press the button to begin verification. You will get a short code to enter (e.g., L3q9xd). If the code matches, you will get the verified role.")
            .setThumbnail("https://i.https://emoji.discadia.com/emojis/3ba1d4c6-1532-494f-be0e-028e0cc78e84.png.com/1XQZ1ZB.png")
            .setColor("#00ff66");

          const row = new ActionRowBuilder().addComponents(
            .setColor("#00ff66");

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`verif_start_${i.guild.id}`).setLabel("Verify").setStyle(ButtonStyle.Primary)
          );

          await channel.send({ embeds: [embed], components: [row] });
          return i.reply({ content: "✅ Verification panel posted.", ephemeral: true });
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
          return i.reply({ content: "❌ This verification panel is not properly configured.", ephemeral: true });
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

        return i.reply({ embeds: [embed], components: [openModalButton], ephemeral: true });
      }

      // open modal for a specific user - ensures only the user who started can open
      if (i.customId && i.customId.startsWith("verif_modal_open_")) {
        const parts = i.customId.split("_");
        const userId = parts.slice(3).join("_");

        if (i.user.id !== userId) {
          return i.reply({ content: "❌ You cannot open this modal for another user.", ephemeral: true });
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

        return i.showModal(modal);
      }
    }

    // Handle modal submit for verification code
    if (i.isModalSubmit()) {
      if (i.customId && i.customId.startsWith("verif_modal_")) {
        const parts = i.customId.split("_");
        const userId = parts.slice(2).join("_");

        if (i.user.id !== userId) {
          return i.reply({ content: "❌ Unauthorized modal submission.", ephemeral: true });
        }

        const entry = verifCodes.get(i.user.id);
        if (!entry) {
          return i.reply({ content: "❌ No verification started or code expired.", ephemeral: true });
        }

        if (Date.now() > entry.expiresAt) {
          verifCodes.delete(i.user.id);
          return i.reply({ content: "❌ Code expired. Please try again.", ephemeral: true });
        }

        const value = i.fields.getTextInputValue("code_input").trim();
        if (value !== entry.code) {
          return i.reply({ content: "❌ Incorrect code. Please try again.", ephemeral: true });
        }

        // successful verification
        const settings = verifSettings.get(entry.guildId);
        if (!settings) {
          return i.reply({ content: "❌ Guild verification settings no longer exist.", ephemeral: true });
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

          return i.reply({ content: "✅ Verification successful! Roles updated.", ephemeral: true });
        } catch (err) {
          console.error("Verification role update error:", err);
          return i.reply({ content: "❌ Failed to update roles. Check bot permissions.", ephemeral: true });
        }
      }
    }
  } catch (e) {
    console.error(e);
    if (i.replied || i.deferred) {
      return i.followUp({ content: "❌ Error occurred.", ephemeral: true });
    }
    return i.reply({ content: "❌ Error occurred.", ephemeral: true });
  }
});

// ---------- Login ----------
client.login(process.env.DISCORD_BOT_TOKEN);
