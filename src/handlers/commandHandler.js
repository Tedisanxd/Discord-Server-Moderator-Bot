const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  loadDir(client, commandsPath);
}

function loadDir(client, dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadDir(client, fullPath);
    } else if (entry.name.endsWith('.js')) {
      const cmd = require(fullPath);
      const name = cmd.name || entry.name.replace('.js', '');
      client.commands.set(name, cmd);
      if (cmd.aliases) {
        for (const alias of cmd.aliases) {
          client.commands.set(alias, cmd);
        }
      }
    }
  }
}

module.exports = { loadCommands };
