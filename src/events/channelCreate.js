const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'channelCreate',
  async execute(client, channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('Channel Created')
      .addFields(
        { name: 'Name', value: channel.name },
        { name: 'Type', value: String(channel.type) },
        { name: 'ID', value: channel.id }
      )
      .setTimestamp();
    await logEvent(client, channel.guild.id, 'channelcreate', embed);
  },
};
