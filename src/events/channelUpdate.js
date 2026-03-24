const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'channelUpdate',
  async execute(client, oldCh, newCh) {
    if (!newCh.guild) return;
    const changes = [];
    if (oldCh.name !== newCh.name) changes.push(`Name: \`${oldCh.name}\` → \`${newCh.name}\``);
    if (oldCh.topic !== newCh.topic) changes.push(`Topic: \`${oldCh.topic || 'none'}\` → \`${newCh.topic || 'none'}\``);
    if (oldCh.nsfw !== newCh.nsfw) changes.push(`NSFW: \`${oldCh.nsfw}\` → \`${newCh.nsfw}\``);
    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.warn)
      .setTitle('Channel Updated')
      .addFields(
        { name: 'Channel', value: `<#${newCh.id}>` },
        { name: 'Changes', value: changes.join('\n') }
      )
      .setTimestamp();
    await logEvent(client, newCh.guild.id, 'channelupdate', embed);
  },
};
