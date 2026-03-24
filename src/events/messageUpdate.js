const { logEvent, isIgnored } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');
const db = require('../database');

module.exports = {
  name: 'messageUpdate',
  async execute(client, oldMsg, newMsg) {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    if (isIgnored(newMsg.guild.id, newMsg.channel.id)) return;
    if (newMsg.author && isIgnored(newMsg.guild.id, newMsg.author.id)) return;

    const ignoredPrefixes = db.prepare('SELECT prefix FROM log_ignored_prefixes WHERE guild_id = ?').all(newMsg.guild.id);
    if (ignoredPrefixes.some(p => oldMsg.content?.startsWith(p.prefix))) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.warn)
      .setTitle('Message Edited')
      .addFields(
        { name: 'Author', value: newMsg.author ? `${newMsg.author.tag} (${newMsg.author.id})` : 'Unknown' },
        { name: 'Channel', value: `<#${newMsg.channel.id}>` },
        { name: 'Before', value: oldMsg.content?.slice(0, 1024) || '*(uncached)*' },
        { name: 'After', value: newMsg.content?.slice(0, 1024) || '*(empty)*' },
        { name: 'Jump', value: `[Click to view](${newMsg.url})` }
      )
      .setTimestamp();

    await logEvent(client, newMsg.guild.id, 'edit', embed);
  },
};
