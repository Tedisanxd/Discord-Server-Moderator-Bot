const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'emojiCreate',
  async execute(client, emoji) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('Emoji Created')
      .setThumbnail(emoji.url)
      .addFields(
        { name: 'Name', value: emoji.name },
        { name: 'ID', value: emoji.id },
        { name: 'Animated', value: String(emoji.animated) }
      )
      .setTimestamp();
    await logEvent(client, emoji.guild.id, 'emoji', embed);
  },
};
