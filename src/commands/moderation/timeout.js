const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../../utils/modAction');
const { parseDuration, formatDuration } = require('../../utils/parseDuration');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'timeout',
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 1h, 1d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ embeds: [errorEmbed('User not found.')], ephemeral: true });

    const ms = parseDuration(durationStr);
    if (!ms || ms > 28 * 24 * 60 * 60 * 1000) return interaction.reply({ embeds: [errorEmbed('Invalid duration. Max is 28 days.')], ephemeral: true });

    await target.timeout(ms, reason);
    await createCase(interaction.client, interaction.guild, 'timeout', target.user, interaction.user, reason, ms);
    await interaction.reply({ embeds: [successEmbed(`**${target.user.tag}** timed out for **${formatDuration(ms)}**.\n**Reason:** ${reason}`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Moderate Members** permission.')] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a member.')] });
    const ms = parseDuration(args[1]);
    if (!ms) return message.reply({ embeds: [errorEmbed('Provide a duration (e.g. 10m, 1h).')] });
    const reason = args.slice(2).join(' ') || 'No reason provided';

    await target.timeout(ms, reason);
    await createCase(message.client, message.guild, 'timeout', target.user, message.author, reason, ms);
    message.reply({ embeds: [successEmbed(`**${target.user.tag}** timed out for **${formatDuration(ms)}**.\n**Reason:** ${reason}`)] });
  },
};
