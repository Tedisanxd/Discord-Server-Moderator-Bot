const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../../utils/modAction');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'untimeout',
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a member')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ embeds: [errorEmbed('User not found.')], ephemeral: true });

    await target.timeout(null, reason);
    await createCase(interaction.client, interaction.guild, 'untimeout', target.user, interaction.user, reason);
    await interaction.reply({ embeds: [successEmbed(`Timeout removed from **${target.user.tag}**.`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Moderate Members** permission.')] });
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a member.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.timeout(null, reason);
    await createCase(message.client, message.guild, 'untimeout', target.user, message.author, reason);
    message.reply({ embeds: [successEmbed(`Timeout removed from **${target.user.tag}**.`)] });
  },
};
