const { logEvent, isIgnored } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');
const db = require('../database');

module.exports = {
  name: 'messageDelete',
  async execute(client, message) {
    if (!message.guild || message.author?.bot) return;
    if (isIgnored(message.guild.id, message.channel.id)) return;
    if (message.author && isIgnored(message.guild.id, message.author.id)) return;

    // Ignore ignored prefixes
    const cfg = db.getConfig(message.guild.id);
    const ignoredPrefixes = db.prepare('SELECT prefix FROM log_ignored_prefixes WHERE guild_id = ?').all(message.guild.id);
    if (ignoredPrefixes.some(p => message.content?.startsWith(p.prefix))) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('Message Deleted')
      .addFields(
        { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown' },
        { name: 'Channel', value: `<#${message.channel.id}>` },
        { name: 'Content', value: message.content?.slice(0, 1024) || '*(empty or uncached)*' }
      )
      .setTimestamp();

    if (message.attachments?.size > 0) {
      embed.addFields({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n').slice(0, 1024) });
    }

    await logEvent(client, message.guild.id, 'delete', embed);
  },
};
