const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'emojiDelete',
  async execute(client, emoji) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('Emoji Deleted')
      .addFields(
        { name: 'Name', value: emoji.name },
        { name: 'ID', value: emoji.id }
      )
      .setTimestamp();
    await logEvent(client, emoji.guild.id, 'emoji', embed);
  },
};
