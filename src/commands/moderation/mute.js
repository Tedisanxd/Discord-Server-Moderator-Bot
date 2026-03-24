const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { createCase } = require('../../utils/modAction');
const { parseDuration, formatDuration } = require('../../utils/parseDuration');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'mute',
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member using the mute role')
    .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 1d (leave empty for permanent)'))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const durationStr = interaction.options.getString('duration');
    const ms = durationStr ? parseDuration(durationStr) : null;

    if (!target) return interaction.reply({ embeds: [errorEmbed('User not found.')], ephemeral: true });

    const cfg = db.getConfig(interaction.guild.id);
    if (!cfg.muterole_id) return interaction.reply({ embeds: [errorEmbed('No mute role set. Use `/muterole set` first.')], ephemeral: true });

    const role = interaction.guild.roles.cache.get(cfg.muterole_id);
    if (!role) return interaction.reply({ embeds: [errorEmbed('Mute role not found. Please reconfigure it.')], ephemeral: true });

    await target.roles.add(role, reason);
    if (ms) {
      db.prepare('INSERT INTO temp_punishments (guild_id, user_id, type, expires_at) VALUES (?,?,?,?)').run(interaction.guild.id, target.id, 'mute', Date.now() + ms);
    }
    await createCase(interaction.client, interaction.guild, 'mute', target.user, interaction.user, reason, ms);
    await interaction.reply({ embeds: [successEmbed(`**${target.user.tag}** muted${ms ? ` for **${formatDuration(ms)}**` : ' permanently'}.\n**Reason:** ${reason}`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Moderate Members** permission.')] });
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a member.')] });
    const cfg = db.getConfig(message.guild.id);
    if (!cfg.muterole_id) return message.reply({ embeds: [errorEmbed('No mute role set.')] });
    const role = message.guild.roles.cache.get(cfg.muterole_id);
    if (!role) return message.reply({ embeds: [errorEmbed('Mute role not found.')] });

    const ms = args[1] ? parseDuration(args[1]) : null;
    const reason = args.slice(ms ? 2 : 1).join(' ') || 'No reason provided';

    await target.roles.add(role, reason);
    if (ms) db.prepare('INSERT INTO temp_punishments (guild_id, user_id, type, expires_at) VALUES (?,?,?,?)').run(message.guild.id, target.id, 'mute', Date.now() + ms);
    await createCase(message.client, message.guild, 'mute', target.user, message.author, reason, ms);
    message.reply({ embeds: [successEmbed(`**${target.user.tag}** muted${ms ? ` for **${formatDuration(ms)}**` : ' permanently'}.`)] });
  },
};
