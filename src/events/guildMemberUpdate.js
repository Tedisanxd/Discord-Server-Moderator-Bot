const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(client, oldMember, newMember) {
    // Nickname / username change
    if (oldMember.nickname !== newMember.nickname) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('Nickname Changed')
        .addFields(
          { name: 'User', value: `${newMember.user.tag} (${newMember.id})` },
          { name: 'Before', value: oldMember.nickname || oldMember.user.username },
          { name: 'After', value: newMember.nickname || newMember.user.username }
        )
        .setTimestamp();
      await logEvent(client, newMember.guild.id, 'name', embed);
    }

    // Role changes
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size > 0 || removed.size > 0) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('Member Roles Updated')
        .addFields({ name: 'User', value: `${newMember.user.tag} (${newMember.id})` })
        .setTimestamp();
      if (added.size > 0) embed.addFields({ name: 'Roles Added', value: added.map(r => `<@&${r.id}>`).join(', ') });
      if (removed.size > 0) embed.addFields({ name: 'Roles Removed', value: removed.map(r => `<@&${r.id}>`).join(', ') });
      await logEvent(client, newMember.guild.id, 'role', embed);
    }

    // Timeout changes
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    if (!oldTimeout && newTimeout && newTimeout > Date.now()) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.warn)
        .setTitle('Member Timed Out')
        .addFields(
          { name: 'User', value: `${newMember.user.tag} (${newMember.id})` },
          { name: 'Until', value: `<t:${Math.floor(newTimeout / 1000)}:F>` }
        )
        .setTimestamp();
      await logEvent(client, newMember.guild.id, 'timeout', embed);
    } else if (oldTimeout && (!newTimeout || newTimeout <= Date.now())) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('Member Timeout Removed')
        .addFields({ name: 'User', value: `${newMember.user.tag} (${newMember.id})` })
        .setTimestamp();
      await logEvent(client, newMember.guild.id, 'removetimeout', embed);
    }

    // Avatar change
    if (oldMember.user.avatar !== newMember.user.avatar) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('Avatar Updated')
        .addFields({ name: 'User', value: `${newMember.user.tag} (${newMember.id})` })
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp();
      await logEvent(client, newMember.guild.id, 'avatar', embed);
    }
  },
};
