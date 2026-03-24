const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../../utils/modAction');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'ban',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for ban'))
    .addIntegerOption(o => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member) {
      if (!member.bannable) return interaction.reply({ embeds: [errorEmbed('I cannot ban that user.')], ephemeral: true });
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ embeds: [errorEmbed('You cannot ban someone with a higher or equal role.')], ephemeral: true });
      }
    }

    await interaction.guild.members.ban(target.id, { reason, deleteMessageDays: deleteDays });
    await createCase(interaction.client, interaction.guild, 'ban', target, interaction.user, reason);
    await interaction.reply({ embeds: [successEmbed(`**${target.tag}** has been banned.\n**Reason:** ${reason}`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Ban Members** permission.')] });

    const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a user to ban.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return message.reply({ embeds: [errorEmbed('I cannot ban that user.')] });

    await message.guild.members.ban(target.id, { reason });
    await createCase(message.client, message.guild, 'ban', target, message.author, reason);
    message.reply({ embeds: [successEmbed(`**${target.tag}** has been banned.\n**Reason:** ${reason}`)] });
  },
};
