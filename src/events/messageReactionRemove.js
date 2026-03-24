const db = require('../database');

module.exports = {
  name: 'messageReactionRemove',
  async execute(client, reaction, user) {
    if (user.bot) return;
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (!reaction.message.guild) return;

    const guildId = reaction.message.guild.id;
    const emoji = reaction.emoji.id || reaction.emoji.name;

    const rr = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?').get(guildId, reaction.message.id, emoji);
    if (!rr) return;

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = reaction.message.guild.roles.cache.get(rr.role_id);
    if (role) await member.roles.remove(role).catch(() => {});
  },
};
