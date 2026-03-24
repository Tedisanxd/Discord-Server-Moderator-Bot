const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

module.exports = {
  name: 'roleDelete',
  async execute(client, role) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('Role Deleted')
      .addFields(
        { name: 'Name', value: role.name },
        { name: 'ID', value: role.id }
      )
      .setTimestamp();
    await logEvent(client, role.guild.id, 'roledelete', embed);
  },
};
