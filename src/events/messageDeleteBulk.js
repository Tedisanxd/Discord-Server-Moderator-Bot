const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'messageDeleteBulk',
  async execute(client, messages) {
    const first = messages.first();
    if (!first?.guild) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('Bulk Message Delete (Purge)')
      .addFields(
        { name: 'Channel', value: `<#${first.channel.id}>` },
        { name: 'Messages Deleted', value: String(messages.size) }
      )
      .setTimestamp();

    await logEvent(client, first.guild.id, 'purge', embed);
  },
};
