require('dotenv').config();
const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

function loadDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
  }
}

loadDir(commandsPath);

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log(`Slash commands registered to guild ${process.env.GUILD_ID} (instant).`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('Slash commands registered globally (up to 1 hour).');
    }
  } catch (err) {
    console.error(err);
  }
})();
