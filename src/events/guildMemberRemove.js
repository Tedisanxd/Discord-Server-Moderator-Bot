const db = require('../database');
const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    const cfg = db.getConfig(member.guild.id);

    // Leave message
    if (cfg.leave_channel) {
      const channel = member.guild.channels.cache.get(cfg.leave_channel);
      if (channel) {
        const msg = (cfg.leave_message || '**{username}** has left the server.')
          .replace(/{username}/g, member.user.username)
          .replace(/{user}/g, `<@${member.id}>`)
          .replace(/{server}/g, member.guild.name)
          .replace(/{membercount}/g, member.guild.memberCount);
        channel.send(msg).catch(() => {});
      }
    }

    // Log leave
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('Member Left')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})` },
        { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown' },
        { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'None' }
      )
      .setTimestamp();

    await logEvent(client, member.guild.id, 'leave', embed);
  },
};
