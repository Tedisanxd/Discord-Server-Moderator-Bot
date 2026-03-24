const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const { parseDuration } = require('../../utils/parseDuration');

module.exports = {
  name: 'automod',
  aliases: ['am'],
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automod')
    .addSubcommand(s => s.setName('show').setDescription('Show current automod settings'))
    .addSubcommand(s => s.setName('toggle').setDescription('Enable or disable automod'))
    .addSubcommand(s => s.setName('log').setDescription('Set automod log channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('spam').setDescription('Set spam rate limit').addIntegerOption(o => o.setName('messages').setDescription('Max messages').setRequired(true)).addIntegerOption(o => o.setName('seconds').setDescription('Per seconds').setRequired(true)).addStringOption(o => o.setName('punishment').setDescription('e.g. delete,warn')))
    .addSubcommand(s => s.setName('badword').setDescription('Add/remove a bad word').addStringOption(o => o.setName('word').setDescription('Word').setRequired(true)).addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })).addStringOption(o => o.setName('punishment').setDescription('e.g. delete,warn')))
    .addSubcommand(s => s.setName('links').setDescription('Toggle link filter').addStringOption(o => o.setName('action').setDescription('enable/disable').setRequired(true).addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })).addStringOption(o => o.setName('punishment').setDescription('Punishment')))
    .addSubcommand(s => s.setName('invites').setDescription('Toggle Discord invite filter').addStringOption(o => o.setName('action').setDescription('enable/disable').setRequired(true).addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
    .addSubcommand(s => s.setName('media').setDescription('Set/unset a media-only channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)).addStringOption(o => o.setName('action').setDescription('add/remove').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })))
    .addSubcommand(s => s.setName('whitelist').setDescription('Whitelist a role/channel').addMentionableOption(o => o.setName('target').setDescription('Role or channel').setRequired(true)).addStringOption(o => o.setName('action').setDescription('add/remove').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })))
    .addSubcommand(s => s.setName('warnthreshold').setDescription('Set warn threshold').addIntegerOption(o => o.setName('limit').setDescription('Warning count before punishment (0 = off)').setRequired(true)).addStringOption(o => o.setName('punishment').setDescription('Punishment (e.g. kick, ban)')))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const cfg = db.getConfig(guildId);

    if (sub === 'show') {
      const badWords = db.prepare('SELECT word FROM automod_bad_words WHERE guild_id = ?').all(guildId).map(r => r.word);
      const mediaChannels = db.prepare('SELECT channel_id FROM automod_media_channels WHERE guild_id = ?').all(guildId).map(r => `<#${r.channel_id}>`);
      const whitelist = db.prepare('SELECT target_id, type FROM automod_whitelist WHERE guild_id = ?').all(guildId).map(r => r.type === 'role' ? `<@&${r.target_id}>` : `<#${r.target_id}>`);
      const linkFilter = db.prepare('SELECT * FROM automod_link_filter WHERE guild_id = ?').get(guildId);
      const inviteFilter = db.prepare('SELECT * FROM automod_invite_filter WHERE guild_id = ?').get(guildId);

      const lines = [
        `**Enabled:** ${cfg.automod_enabled ? 'Yes' : 'No'}`,
        `**Spam:** ${cfg.automod_spam_rate > 0 ? `${cfg.automod_spam_rate} msgs/${cfg.automod_spam_per}s → ${cfg.automod_spam_punishment}` : 'Off'}`,
        `**Link Filter:** ${linkFilter?.enabled ? `On → ${linkFilter.punishment}` : 'Off'}`,
        `**Invite Filter:** ${inviteFilter?.enabled ? 'On' : 'Off'}`,
        `**Bad Words:** ${badWords.length ? badWords.join(', ') : 'None'}`,
        `**Media-only:** ${mediaChannels.length ? mediaChannels.join(', ') : 'None'}`,
        `**Whitelist:** ${whitelist.length ? whitelist.join(', ') : 'None'}`,
        `**Warn Threshold:** ${cfg.automod_warn_threshold > 0 ? `${cfg.automod_warn_threshold} → ${cfg.automod_warn_punishment}` : 'Off'}`,
        `**Log Channel:** ${cfg.automod_log_channel ? `<#${cfg.automod_log_channel}>` : 'Not set'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n'), 'AutoMod Settings')] });
    }

    if (sub === 'toggle') {
      const newVal = cfg.automod_enabled ? 0 : 1;
      db.setConfig(guildId, 'automod_enabled', newVal);
      return interaction.reply({ embeds: [successEmbed(`AutoMod ${newVal ? 'enabled' : 'disabled'}.`)] });
    }

    if (sub === 'log') {
      const channel = interaction.options.getChannel('channel');
      db.setConfig(guildId, 'automod_log_channel', channel.id);
      return interaction.reply({ embeds: [successEmbed(`AutoMod log channel set to <#${channel.id}>.`)] });
    }

    if (sub === 'spam') {
      const msgs = interaction.options.getInteger('messages');
      const secs = interaction.options.getInteger('seconds');
      const punishment = interaction.options.getString('punishment') || 'delete,warn';
      db.setConfig(guildId, 'automod_spam_rate', msgs);
      db.setConfig(guildId, 'automod_spam_per', secs);
      db.setConfig(guildId, 'automod_spam_punishment', punishment);
      return interaction.reply({ embeds: [successEmbed(`Spam limit set: **${msgs}** messages per **${secs}s** → ${punishment}.`)] });
    }

    if (sub === 'badword') {
      const word = interaction.options.getString('word').toLowerCase();
      const action = interaction.options.getString('action');
      const punishment = interaction.options.getString('punishment') || 'delete,warn';
      if (action === 'add') {
        db.prepare('INSERT OR REPLACE INTO automod_bad_words (guild_id, word, punishment) VALUES (?,?,?)').run(guildId, word, punishment);
        return interaction.reply({ embeds: [successEmbed(`Added \`${word}\` to bad words.`)] });
      } else {
        db.prepare('DELETE FROM automod_bad_words WHERE guild_id = ? AND word = ?').run(guildId, word);
        return interaction.reply({ embeds: [successEmbed(`Removed \`${word}\` from bad words.`)] });
      }
    }

    if (sub === 'links') {
      const enabled = interaction.options.getString('action') === 'enable' ? 1 : 0;
      const punishment = interaction.options.getString('punishment') || 'delete';
      db.prepare('INSERT OR REPLACE INTO automod_link_filter (guild_id, enabled, punishment) VALUES (?,?,?)').run(guildId, enabled, punishment);
      return interaction.reply({ embeds: [successEmbed(`Link filter ${enabled ? 'enabled' : 'disabled'}.`)] });
    }

    if (sub === 'invites') {
      const enabled = interaction.options.getString('action') === 'enable' ? 1 : 0;
      db.prepare('INSERT OR REPLACE INTO automod_invite_filter (guild_id, enabled) VALUES (?,?)').run(guildId, enabled);
      return interaction.reply({ embeds: [successEmbed(`Invite filter ${enabled ? 'enabled' : 'disabled'}.`)] });
    }

    if (sub === 'media') {
      const channel = interaction.options.getChannel('channel');
      const action = interaction.options.getString('action');
      if (action === 'add') {
        db.prepare('INSERT OR IGNORE INTO automod_media_channels (guild_id, channel_id) VALUES (?,?)').run(guildId, channel.id);
        return interaction.reply({ embeds: [successEmbed(`<#${channel.id}> is now media-only.`)] });
      } else {
        db.prepare('DELETE FROM automod_media_channels WHERE guild_id = ? AND channel_id = ?').run(guildId, channel.id);
        return interaction.reply({ embeds: [successEmbed(`Removed media-only restriction from <#${channel.id}>.`)] });
      }
    }

    if (sub === 'whitelist') {
      const target = interaction.options.getMentionable('target');
      const action = interaction.options.getString('action');
      const type = target.type === undefined ? 'role' : 'channel';
      if (action === 'add') {
        db.prepare('INSERT OR IGNORE INTO automod_whitelist (guild_id, target_id, type) VALUES (?,?,?)').run(guildId, target.id, type);
        return interaction.reply({ embeds: [successEmbed(`Added to automod whitelist.`)] });
      } else {
        db.prepare('DELETE FROM automod_whitelist WHERE guild_id = ? AND target_id = ?').run(guildId, target.id);
        return interaction.reply({ embeds: [successEmbed(`Removed from automod whitelist.`)] });
      }
    }

    if (sub === 'warnthreshold') {
      const limit = interaction.options.getInteger('limit');
      const punishment = interaction.options.getString('punishment') || 'kick';
      db.setConfig(guildId, 'automod_warn_threshold', limit);
      db.setConfig(guildId, 'automod_warn_punishment', punishment);
      return interaction.reply({ embeds: [successEmbed(`Warn threshold set to **${limit}** → ${punishment}. ${limit === 0 ? '(Off)' : ''}`)] });
    }
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.reply({ embeds: [errorEmbed('Missing **Manage Server** permission.')] });

    const cfg = db.getConfig(message.guild.id);
    const sub = args[0]?.toLowerCase();

    if (!sub) {
      const badWords = db.prepare('SELECT word FROM automod_bad_words WHERE guild_id = ?').all(message.guild.id).map(r => r.word);
      const lines = [
        `**Enabled:** ${cfg.automod_enabled ? 'Yes' : 'No'}`,
        `**Spam:** ${cfg.automod_spam_rate > 0 ? `${cfg.automod_spam_rate}/${cfg.automod_spam_per}s` : 'Off'}`,
        `**Bad Words:** ${badWords.length ? badWords.join(', ') : 'None'}`,
        `**Warn Threshold:** ${cfg.automod_warn_threshold > 0 ? `${cfg.automod_warn_threshold} → ${cfg.automod_warn_punishment}` : 'Off'}`,
      ];
      return message.reply({ embeds: [infoEmbed(lines.join('\n'), 'AutoMod Overview')] });
    }

    if (sub === 'log') {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply({ embeds: [errorEmbed('Mention a channel.')] });
      db.setConfig(message.guild.id, 'automod_log_channel', ch.id);
      return message.reply({ embeds: [successEmbed(`AutoMod log set to <#${ch.id}>.`)] });
    }

    if (['wl', 'whitelist'].includes(sub)) {
      const targets = [...message.mentions.roles.values(), ...message.mentions.channels.values()];
      for (const t of targets) {
        const type = t.constructor.name.toLowerCase().includes('channel') ? 'channel' : 'role';
        db.prepare('INSERT OR IGNORE INTO automod_whitelist (guild_id, target_id, type) VALUES (?,?,?)').run(message.guild.id, t.id, type);
      }
      return message.reply({ embeds: [successEmbed(`Whitelisted ${targets.length} target(s).`)] });
    }

    if (['unwl', 'unwhitelist'].includes(sub)) {
      const targets = [...message.mentions.roles.values(), ...message.mentions.channels.values()];
      for (const t of targets) db.prepare('DELETE FROM automod_whitelist WHERE guild_id = ? AND target_id = ?').run(message.guild.id, t.id);
      return message.reply({ embeds: [successEmbed(`Unwhitelisted ${targets.length} target(s).`)] });
    }

    if (['mo', 'media'].includes(sub)) {
      const channels = [...message.mentions.channels.values()];
      for (const ch of channels) db.prepare('INSERT OR IGNORE INTO automod_media_channels (guild_id, channel_id) VALUES (?,?)').run(message.guild.id, ch.id);
      return message.reply({ embeds: [successEmbed(`Set ${channels.length} media-only channel(s).`)] });
    }

    if (['umo', 'unmo', 'unmedia'].includes(sub)) {
      const channels = [...message.mentions.channels.values()];
      for (const ch of channels) db.prepare('DELETE FROM automod_media_channels WHERE guild_id = ? AND channel_id = ?').run(message.guild.id, ch.id);
      return message.reply({ embeds: [successEmbed(`Removed media-only from ${channels.length} channel(s).`)] });
    }

    if (['warn', 'threshold'].includes(sub)) {
      const limit = parseInt(args[1]);
      if (isNaN(limit)) return message.reply({ embeds: [errorEmbed('Provide a number.')] });
      db.setConfig(message.guild.id, 'automod_warn_threshold', limit);
      return message.reply({ embeds: [successEmbed(`Warn threshold set to **${limit}**.`)] });
    }

    if (['wp', 'warnpunish'].includes(sub)) {
      const punishment = args.slice(1).join(' ');
      if (!punishment) return message.reply({ embeds: [errorEmbed('Provide a punishment.')] });
      db.setConfig(message.guild.id, 'automod_warn_punishment', punishment);
      return message.reply({ embeds: [successEmbed(`Warn punishment set to **${punishment}**.`)] });
    }

    message.reply({ embeds: [errorEmbed('Use `/automod show` to see settings or `/automod` slash commands.')] });
  },
};
