const fs = require('fs');
const path = require('path');

function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const event = require(path.join(eventsPath, file));
    const name = event.name || file.replace('.js', '');
    if (event.once) {
      client.once(name, (...args) => event.execute(client, ...args));
    } else {
      client.on(name, (...args) => event.execute(client, ...args));
    }
  }
}

module.exports = { loadEvents };
