const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member) return;
    const guildId = newState.guild?.id || oldState.guild?.id;
    if (!guildId) return;

    let eventName, title, color;

    if (!oldState.channel && newState.channel) {
      eventName = 'voicejoin';
      title = 'Joined Voice Channel';
      color = COLORS.success;
    } else if (oldState.channel && !newState.channel) {
      eventName = 'voiceleave';
      title = 'Left Voice Channel';
      color = COLORS.error;
    } else if (oldState.channel?.id !== newState.channel?.id) {
      eventName = 'voicemove';
      title = 'Moved Voice Channel';
      color = COLORS.warn;
    } else {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .addFields({ name: 'User', value: `${member.user.tag} (${member.id})` })
      .setTimestamp();

    if (oldState.channel) embed.addFields({ name: 'From', value: oldState.channel.name });
    if (newState.channel) embed.addFields({ name: 'To', value: newState.channel.name });

    await logEvent(client, guildId, eventName, embed);
  },
};
