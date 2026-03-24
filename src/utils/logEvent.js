const db = require('../database');

// Event bitmask values (matching Carl-bot)
const EVENTS = {
  delete: 1,
  edit: 2,
  purge: 4,
  role: 8,
  avatar: 32,
  ban: 64,
  unban: 128,
  join: 256,
  leave: 512,
  channelcreate: 1024,
  channelupdate: 2048,
  channeldelete: 4096,
  voicejoin: 8192,
  voicemove: 16384,
  voiceleave: 32768,
  rolecreate: 65536,
  roleupdate: 131072,
  roledelete: 262144,
  server: 524288,
  emoji: 1048576,
  discord: 2097152,
};

// Which channel type each event goes to
const EVENT_CHANNEL = {
  delete: 'log_message_channel',
  edit: 'log_message_channel',
  purge: 'log_message_channel',
  discord: 'log_message_channel',
  role: 'log_member_channel',
  avatar: 'log_member_channel',
  ban: 'log_member_channel',
  unban: 'log_member_channel',
  timeout: 'log_member_channel',
  removetimeout: 'log_member_channel',
  name: 'log_member_channel',
  join: 'log_join_channel',
  leave: 'log_join_channel',
  channelcreate: 'log_server_channel',
  channelupdate: 'log_server_channel',
  channeldelete: 'log_server_channel',
  rolecreate: 'log_server_channel',
  roleupdate: 'log_server_channel',
  roledelete: 'log_server_channel',
  emoji: 'log_server_channel',
  server: 'log_server_channel',
  voicejoin: 'log_voice_channel',
  voicemove: 'log_voice_channel',
  voiceleave: 'log_voice_channel',
};

function isEnabled(cfg, eventName) {
  if (['timeout', 'removetimeout'].includes(eventName)) {
    return eventName === 'timeout' ? !!cfg.log_timeout_enabled : !!cfg.log_removetimeout_enabled;
  }
  if (eventName === 'name') return !!cfg.log_name_enabled;
  const bit = EVENTS[eventName];
  if (!bit) return false;
  return (cfg.log_events & bit) !== 0;
}

function getChannel(client, cfg, eventName) {
  const key = EVENT_CHANNEL[eventName];
  const id = (key && cfg[key]) || cfg.log_channel;
  if (!id) return null;
  return client.channels.cache.get(id) || null;
}

function isIgnored(guildId, targetId) {
  return !!db.prepare('SELECT 1 FROM log_ignored WHERE guild_id = ? AND target_id = ?').get(guildId, targetId);
}

async function logEvent(client, guildId, eventName, embed) {
  const cfg = db.getConfig(guildId);
  if (!isEnabled(cfg, eventName)) return;
  const channel = getChannel(client, cfg, eventName);
  if (!channel) return;
  try {
    await channel.send({ embeds: [embed] });
  } catch {}
}

module.exports = { logEvent, isEnabled, getChannel, isIgnored, EVENTS };
