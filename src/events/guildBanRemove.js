const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'guildBanRemove',
  async execute(client, ban) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('Member Unbanned')
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields({ name: 'User', value: `${ban.user.tag} (${ban.user.id})` })
      .setTimestamp();

    await logEvent(client, ban.guild.id, 'unban', embed);
  },
};
