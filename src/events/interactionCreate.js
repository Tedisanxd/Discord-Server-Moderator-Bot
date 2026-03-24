const { errorEmbed } = require('../utils/embed');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    // Button interactions
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('help_')) {
        const help = client.commands.get('help');
        if (help?.handleButton) return help.handleButton(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd || !cmd.execute) return;

    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(err);
      const reply = { embeds: [errorEmbed('An error occurred running this command.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  },
};
