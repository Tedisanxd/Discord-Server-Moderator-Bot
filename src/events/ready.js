const db = require('../database');
const { formatDuration } = require('../utils/parseDuration');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('your server', { type: 3 }); // WATCHING

    // Check temp punishments every 30 seconds
    setInterval(async () => {
      const now = Date.now();
      const expired = db.prepare('SELECT * FROM temp_punishments WHERE expires_at <= ?').all(now);
      for (const entry of expired) {
        try {
          const guild = client.guilds.cache.get(entry.guild_id);
          if (!guild) continue;
          if (entry.type === 'mute') {
            const member = await guild.members.fetch(entry.user_id).catch(() => null);
            const cfg = db.getConfig(guild.id);
            if (member && cfg.muterole_id) {
              await member.roles.remove(cfg.muterole_id, 'Temp mute expired').catch(() => {});
            }
          } else if (entry.type === 'ban') {
            await guild.members.unban(entry.user_id, 'Temp ban expired').catch(() => {});
          }
          db.prepare('DELETE FROM temp_punishments WHERE id = ?').run(entry.id);
        } catch {}
      }
    }, 30_000);
  },
};
