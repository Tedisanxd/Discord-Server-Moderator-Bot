const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'guildUpdate',
  async execute(client, oldGuild, newGuild) {
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push(`Name: \`${oldGuild.name}\` → \`${newGuild.name}\``);
    if (oldGuild.icon !== newGuild.icon) changes.push('Icon changed');
    if (oldGuild.banner !== newGuild.banner) changes.push('Banner changed');
    if (oldGuild.description !== newGuild.description) changes.push(`Description updated`);
    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('Server Updated')
      .addFields({ name: 'Changes', value: changes.join('\n') })
      .setTimestamp();
    await logEvent(client, newGuild.id, 'server', embed);
  },
};
