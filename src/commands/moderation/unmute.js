const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { createCase } = require('../../utils/modAction');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'unmute',
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member')
    .addUserOption(o => o.setName('user').setDescription('User to unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ embeds: [errorEmbed('User not found.')], ephemeral: true });

    const cfg = db.getConfig(interaction.guild.id);
    if (!cfg.muterole_id) return interaction.reply({ embeds: [errorEmbed('No mute role configured.')], ephemeral: true });

    await target.roles.remove(cfg.muterole_id, reason);
    db.prepare('DELETE FROM temp_punishments WHERE guild_id = ? AND user_id = ? AND type = ?').run(interaction.guild.id, target.id, 'mute');
    await createCase(interaction.client, interaction.guild, 'unmute', target.user, interaction.user, reason);
    await interaction.reply({ embeds: [successEmbed(`**${target.user.tag}** has been unmuted.`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Moderate Members** permission.')] });
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a member.')] });
    const cfg = db.getConfig(message.guild.id);
    if (!cfg.muterole_id) return message.reply({ embeds: [errorEmbed('No mute role configured.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.roles.remove(cfg.muterole_id, reason);
    db.prepare('DELETE FROM temp_punishments WHERE guild_id = ? AND user_id = ? AND type = ?').run(message.guild.id, target.id, 'mute');
    await createCase(message.client, message.guild, 'unmute', target.user, message.author, reason);
    message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been unmuted.`)] });
  },
};
