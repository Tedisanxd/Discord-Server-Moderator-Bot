const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../../utils/modAction');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'kick',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ embeds: [errorEmbed('User not found in server.')], ephemeral: true });
    if (!target.kickable) return interaction.reply({ embeds: [errorEmbed('I cannot kick that user.')], ephemeral: true });
    if (target.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({ embeds: [errorEmbed('You cannot kick someone with a higher or equal role.')], ephemeral: true });

    await target.kick(reason);
    await createCase(interaction.client, interaction.guild, 'kick', target.user, interaction.user, reason);
    await interaction.reply({ embeds: [successEmbed(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Kick Members** permission.')] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a member to kick.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (!target.kickable) return message.reply({ embeds: [errorEmbed('I cannot kick that user.')] });

    await target.kick(reason);
    await createCase(message.client, message.guild, 'kick', target.user, message.author, reason);
    message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
  },
};
