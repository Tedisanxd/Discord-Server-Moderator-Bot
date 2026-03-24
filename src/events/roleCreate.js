const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'roleCreate',
  async execute(client, role) {
    const embed = new EmbedBuilder()
      .setColor(role.color || COLORS.success)
      .setTitle('Role Created')
      .addFields(
        { name: 'Name', value: role.name },
        { name: 'ID', value: role.id },
        { name: 'Color', value: role.hexColor }
      )
      .setTimestamp();
    await logEvent(client, role.guild.id, 'rolecreate', embed);
  },
};
