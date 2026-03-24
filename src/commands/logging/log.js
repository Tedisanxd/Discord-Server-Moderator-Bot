const db = require('../../database');
const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const { EVENTS } = require('../../utils/logEvent');

const EVENT_NAMES = Object.keys(EVENTS).concat(['timeout', 'removetimeout', 'name', 'everything', 'nothing', 'default']);

const CHANNEL_KEYS = {
  channel: 'log_channel',
  messagechannel: 'log_message_channel',
  memberchannel: 'log_member_channel',
  joinchannel: 'log_join_channel',
  serverchannel: 'log_server_channel',
  voicechannel: 'log_voice_channel',
};

module.exports = {
  name: 'log',
  aliases: [],

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [errorEmbed('You need **Manage Server** permission.')] });
    }

    const guildId = message.guild.id;
    const cfg = db.getConfig(guildId);
    const sub = args[0]?.toLowerCase();

    // !log (no args) — show current config
    if (!sub) {
      const enabled = [];
      for (const [name, bit] of Object.entries(EVENTS)) {
        if (cfg.log_events & bit) enabled.push(name);
      }
      if (cfg.log_timeout_enabled) enabled.push('timeout');
      if (cfg.log_removetimeout_enabled) enabled.push('removetimeout');
      if (cfg.log_name_enabled) enabled.push('name');

      const lines = [
        `**Default:** ${cfg.log_channel ? `<#${cfg.log_channel}>` : 'Not set'}`,
        `**Messages:** ${cfg.log_message_channel ? `<#${cfg.log_message_channel}>` : 'fallback'}`,
        `**Members:** ${cfg.log_member_channel ? `<#${cfg.log_member_channel}>` : 'fallback'}`,
        `**Join/Leave:** ${cfg.log_join_channel ? `<#${cfg.log_join_channel}>` : 'fallback'}`,
        `**Server:** ${cfg.log_server_channel ? `<#${cfg.log_server_channel}>` : 'fallback'}`,
        `**Voice:** ${cfg.log_voice_channel ? `<#${cfg.log_voice_channel}>` : 'fallback'}`,
        `**Enabled Events:** ${enabled.length ? enabled.join(', ') : 'none'}`,
      ];
      return message.reply({ embeds: [infoEmbed(lines.join('\n'), 'Logging Configuration')] });
    }

    // !log aio — create category + 5 channels
    if (sub === 'aio') {
      const category = await message.guild.channels.create({
        name: 'logs', type: ChannelType.GuildCategory,
        permissionOverwrites: [{ id: message.guild.id, deny: ['ViewChannel'] }],
      });
      const toCreate = [
        ['msg-logs', 'log_message_channel'],
        ['member-logs', 'log_member_channel'],
        ['join-logs', 'log_join_channel'],
        ['server-logs', 'log_server_channel'],
        ['voice-logs', 'log_voice_channel'],
      ];
      for (const [name, key] of toCreate) {
        const ch = await message.guild.channels.create({ name, type: ChannelType.GuildText, parent: category });
        db.setConfig(guildId, key, ch.id);
      }
      // Enable default events
      db.setConfig(guildId, 'log_events', 1 + 2 + 4 + 8 + 32 + 64 + 128 + 256 + 512);
      return message.reply({ embeds: [successEmbed('Created log category with 5 channels and enabled default events!')] });
    }

    // !log export
    if (sub === 'export') {
      const json = JSON.stringify({
        log_channel: cfg.log_channel,
        log_message_channel: cfg.log_message_channel,
        log_member_channel: cfg.log_member_channel,
        log_join_channel: cfg.log_join_channel,
        log_server_channel: cfg.log_server_channel,
        log_voice_channel: cfg.log_voice_channel,
        log_events: cfg.log_events,
        log_timeout_enabled: cfg.log_timeout_enabled,
        log_removetimeout_enabled: cfg.log_removetimeout_enabled,
        log_name_enabled: cfg.log_name_enabled,
      }, null, 2);
      return message.reply({ content: '```json\n' + json + '\n```' });
    }

    // !log channel/messagechannel/etc [#channel]
    if (CHANNEL_KEYS[sub]) {
      const key = CHANNEL_KEYS[sub];
      const mention = message.mentions.channels.first();
      db.setConfig(guildId, key, mention?.id || null);
      return message.reply({ embeds: [successEmbed(mention ? `Log channel set to <#${mention.id}>.` : 'Log channel cleared.')] });
    }

    // !log ignore/unignore
    if (sub === 'ignore' || sub === 'unignore') {
      const targets = [...message.mentions.channels.values(), ...message.mentions.users.values()];
      if (!targets.length) return message.reply({ embeds: [errorEmbed('Mention channels or users to ignore.')] });
      for (const t of targets) {
        const type = t.send ? 'member' : 'channel';
        if (sub === 'ignore') {
          db.prepare('INSERT OR IGNORE INTO log_ignored (guild_id, target_id, type) VALUES (?,?,?)').run(guildId, t.id, type);
        } else {
          db.prepare('DELETE FROM log_ignored WHERE guild_id = ? AND target_id = ?').run(guildId, t.id);
        }
      }
      return message.reply({ embeds: [successEmbed(`${sub === 'ignore' ? 'Ignoring' : 'Unignoring'} ${targets.length} target(s).`)] });
    }

    // !log ip/prefix (ignore prefix) / !log up/removeprefix
    if (['ip', 'prefix'].includes(sub)) {
      const p = args[1];
      if (!p) return message.reply({ embeds: [errorEmbed('Provide a prefix to ignore.')] });
      db.prepare('INSERT OR IGNORE INTO log_ignored_prefixes (guild_id, prefix) VALUES (?,?)').run(guildId, p);
      return message.reply({ embeds: [successEmbed(`Now ignoring messages starting with \`${p}\`.`)] });
    }
    if (['up', 'removeprefix'].includes(sub)) {
      const p = args[1];
      if (!p) return message.reply({ embeds: [errorEmbed('Provide a prefix to remove.')] });
      db.prepare('DELETE FROM log_ignored_prefixes WHERE guild_id = ? AND prefix = ?').run(guildId, p);
      return message.reply({ embeds: [successEmbed(`No longer ignoring prefix \`${p}\`.`)] });
    }

    // !log [event] — toggle event
    if (EVENT_NAMES.includes(sub)) {
      if (sub === 'everything') {
        db.setConfig(guildId, 'log_events', 4194303);
        db.setConfig(guildId, 'log_timeout_enabled', 1);
        db.setConfig(guildId, 'log_removetimeout_enabled', 1);
        db.setConfig(guildId, 'log_name_enabled', 1);
        return message.reply({ embeds: [successEmbed('Enabled all log events.')] });
      }
      if (sub === 'nothing') {
        db.setConfig(guildId, 'log_events', 0);
        db.setConfig(guildId, 'log_timeout_enabled', 0);
        db.setConfig(guildId, 'log_removetimeout_enabled', 0);
        db.setConfig(guildId, 'log_name_enabled', 0);
        return message.reply({ embeds: [successEmbed('Disabled all log events.')] });
      }
      if (sub === 'default') {
        db.setConfig(guildId, 'log_events', 1 + 2 + 4 + 8 + 32 + 64 + 128 + 256 + 512);
        return message.reply({ embeds: [successEmbed('Reset to default log events.')] });
      }
      if (sub === 'timeout') {
        const val = cfg.log_timeout_enabled ? 0 : 1;
        db.setConfig(guildId, 'log_timeout_enabled', val);
        return message.reply({ embeds: [successEmbed(`Timeout logging ${val ? 'enabled' : 'disabled'}.`)] });
      }
      if (sub === 'removetimeout') {
        const val = cfg.log_removetimeout_enabled ? 0 : 1;
        db.setConfig(guildId, 'log_removetimeout_enabled', val);
        return message.reply({ embeds: [successEmbed(`Remove-timeout logging ${val ? 'enabled' : 'disabled'}.`)] });
      }
      if (sub === 'name') {
        const val = cfg.log_name_enabled ? 0 : 1;
        db.setConfig(guildId, 'log_name_enabled', val);
        return message.reply({ embeds: [successEmbed(`Name-change logging ${val ? 'enabled' : 'disabled'}.`)] });
      }

      const bit = EVENTS[sub];
      if (!bit) return message.reply({ embeds: [errorEmbed(`Unknown event: \`${sub}\`.`)] });
      const current = cfg.log_events || 0;
      const newVal = current & bit ? current & ~bit : current | bit;
      db.setConfig(guildId, 'log_events', newVal);
      const state = newVal & bit ? 'enabled' : 'disabled';
      return message.reply({ embeds: [successEmbed(`Event \`${sub}\` ${state}.`)] });
    }

    return message.reply({ embeds: [errorEmbed(`Unknown subcommand. Use \`!log\` to see current config.`)] });
  },
};
