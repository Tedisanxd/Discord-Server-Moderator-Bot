const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'channelDelete',
  async execute(client, channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('Channel Deleted')
      .addFields(
        { name: 'Name', value: channel.name },
        { name: 'ID', value: channel.id }
      )
      .setTimestamp();
    await logEvent(client, channel.guild.id, 'channeldelete', embed);
  },
};
