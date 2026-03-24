const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'roleUpdate',
  async execute(client, oldRole, newRole) {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`Name: \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) changes.push(`Color: \`${oldRole.hexColor}\` → \`${newRole.hexColor}\``);
    if (oldRole.hoist !== newRole.hoist) changes.push(`Hoisted: \`${oldRole.hoist}\` → \`${newRole.hoist}\``);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`Mentionable: \`${oldRole.mentionable}\` → \`${newRole.mentionable}\``);
    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(newRole.color || COLORS.warn)
      .setTitle('Role Updated')
      .addFields(
        { name: 'Role', value: `<@&${newRole.id}>` },
        { name: 'Changes', value: changes.join('\n') }
      )
      .setTimestamp();
    await logEvent(client, newRole.guild.id, 'roleupdate', embed);
  },
};
