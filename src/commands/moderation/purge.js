const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'purge',
  aliases: ['clear'],
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });
    let messages = await interaction.channel.messages.fetch({ limit: 100 });
    if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
    const toDelete = [...messages.values()].slice(0, amount);
    const deleted = await interaction.channel.bulkDelete(toDelete, true).catch(() => null);
    await interaction.editReply({ embeds: [successEmbed(`Deleted **${deleted?.size ?? 0}** messages.`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [errorEmbed('Missing **Manage Messages** permission.')] });

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100)
      return message.reply({ embeds: [errorEmbed('Provide a number between 1 and 100.')] });

    const filterUser = message.mentions.users.first();
    let messages = await message.channel.messages.fetch({ limit: 100 });
    if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
    const toDelete = [...messages.values()].slice(0, amount + 1);

    const deleted = await message.channel.bulkDelete(toDelete, true).catch(() => null);
    const reply = await message.channel.send({ embeds: [successEmbed(`Deleted **${(deleted?.size ?? 1) - 1}** messages.`)] });
    setTimeout(() => reply.delete().catch(() => {}), 4000);
  },
};
