const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embed');

module.exports = {
  name: 'verify',
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Manage the verification and ban evasion system')
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Configure the verification system')
      .addChannelOption(o => o.setName('verification_channel').setDescription('Channel where unverified users verify').setRequired(true))
      .addRoleOption(o => o.setName('unverified_role').setDescription('Role given to unverified members').setRequired(true))
      .addRoleOption(o => o.setName('verified_role').setDescription('Role given after verification').setRequired(true))
      .addChannelOption(o => o.setName('alert_channel').setDescription('Channel for ban evasion alerts'))
      .addIntegerOption(o => o.setName('min_account_age').setDescription('Flag accounts newer than X days (default: 7)').setMinValue(0))
    )
    .addSubcommand(s => s.setName('toggle').setDescription('Enable or disable the verification system'))
    .addSubcommand(s => s.setName('info').setDescription('Show current verification settings'))
    .addSubcommand(s => s
      .setName('approve')
      .setDescription('Manually verify a member')
      .addUserOption(o => o.setName('user').setDescription('Member to verify').setRequired(true))
    )
    .addSubcommand(s => s
      .setName('check')
      .setDescription('Check a user for ban evasion indicators')
      .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true))
    )
    .addSubcommandGroup(g => g
      .setName('watchlist')
      .setDescription('Manage the ban evasion watchlist')
      .addSubcommand(s => s
        .setName('add')
        .setDescription('Add a user ID to the watchlist')
        .addStringOption(o => o.setName('user_id').setDescription('User ID to watch for').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason (e.g. alt of banned user)'))
      )
      .addSubcommand(s => s
        .setName('remove')
        .setDescription('Remove a user from the watchlist')
        .addStringOption(o => o.setName('user_id').setDescription('User ID to remove').setRequired(true))
      )
      .addSubcommand(s => s.setName('show').setDescription('Show all watchlisted users'))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // Watchlist subcommands
    if (group === 'watchlist') {
      if (sub === 'add') {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'Manually added';
        db.prepare('INSERT OR REPLACE INTO banned_users (guild_id, user_id, user_tag, account_created_at, banned_at, reason) VALUES (?,?,?,?,?,?)').run(
          guildId, userId, `Unknown (manual watchlist)`, 0, Date.now(), reason
        );
        return interaction.reply({ embeds: [successEmbed(`User ID \`${userId}\` added to watchlist.\n**Reason:** ${reason}`)] });
      }
      if (sub === 'remove') {
        const userId = interaction.options.getString('user_id');
        db.prepare('DELETE FROM banned_users WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
        return interaction.reply({ embeds: [successEmbed(`Removed \`${userId}\` from watchlist.`)] });
      }
      if (sub === 'show') {
        const rows = db.prepare('SELECT * FROM banned_users WHERE guild_id = ? ORDER BY banned_at DESC LIMIT 20').all(guildId);
        if (!rows.length) return interaction.reply({ embeds: [infoEmbed('The watchlist is empty.')], ephemeral: true });
        const lines = rows.map(r => `\`${r.user_id}\` — **${r.user_tag}** — ${r.reason} — <t:${Math.floor(r.banned_at / 1000)}:R>`);
        return interaction.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), 'Ban Evasion Watchlist')] });
      }
    }

    // Setup
    if (sub === 'setup') {
      const vCh = interaction.options.getChannel('verification_channel');
      const unvRole = interaction.options.getRole('unverified_role');
      const vRole = interaction.options.getRole('verified_role');
      const alertCh = interaction.options.getChannel('alert_channel');
      const minAge = interaction.options.getInteger('min_account_age') ?? 7;

      db.prepare(`INSERT OR REPLACE INTO verification_config
        (guild_id, enabled, verification_channel_id, unverified_role_id, verified_role_id, alert_channel_id, min_account_age_days, autoban_previous)
        VALUES (?,1,?,?,?,?,?,1)
      `).run(guildId, vCh.id, unvRole.id, vRole.id, alertCh?.id || null, minAge);

      return interaction.reply({ embeds: [successEmbed(
        `Verification system configured!\n\n` +
        `**Channel:** <#${vCh.id}>\n` +
        `**Unverified Role:** <@&${unvRole.id}>\n` +
        `**Verified Role:** <@&${vRole.id}>\n` +
        `**Alert Channel:** ${alertCh ? `<#${alertCh.id}>` : 'Not set'}\n` +
        `**Min Account Age:** ${minAge} days\n` +
        `**Auto-ban previous bans:** ✅ Enabled`
      )] });
    }

    // Toggle
    if (sub === 'toggle') {
      const cfg = db.prepare('SELECT * FROM verification_config WHERE guild_id = ?').get(guildId);
      if (!cfg) return interaction.reply({ embeds: [errorEmbed('Run `/verify setup` first.')], ephemeral: true });
      const newVal = cfg.enabled ? 0 : 1;
      db.prepare('UPDATE verification_config SET enabled = ? WHERE guild_id = ?').run(newVal, guildId);
      return interaction.reply({ embeds: [successEmbed(`Verification system ${newVal ? 'enabled' : 'disabled'}.`)] });
    }

    // Info
    if (sub === 'info') {
      const cfg = db.prepare('SELECT * FROM verification_config WHERE guild_id = ?').get(guildId);
      if (!cfg) return interaction.reply({ embeds: [infoEmbed('Verification not configured. Use `/verify setup`.', 'Verification')], ephemeral: true });
      const lines = [
        `**Status:** ${cfg.enabled ? '✅ Enabled' : '❌ Disabled'}`,
        `**Channel:** ${cfg.verification_channel_id ? `<#${cfg.verification_channel_id}>` : 'Not set'}`,
        `**Unverified Role:** ${cfg.unverified_role_id ? `<@&${cfg.unverified_role_id}>` : 'Not set'}`,
        `**Verified Role:** ${cfg.verified_role_id ? `<@&${cfg.verified_role_id}>` : 'Not set'}`,
        `**Alert Channel:** ${cfg.alert_channel_id ? `<#${cfg.alert_channel_id}>` : 'Not set'}`,
        `**Min Account Age:** ${cfg.min_account_age_days} days`,
        `**Auto-ban on rejoin:** ${cfg.autoban_previous ? 'Yes' : 'No'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n'), 'Verification Settings')] });
    }

    // Approve
    if (sub === 'approve') {
      const target = interaction.options.getMember('user');
      if (!target) return interaction.reply({ embeds: [errorEmbed('Member not found.')], ephemeral: true });
      const cfg = db.prepare('SELECT * FROM verification_config WHERE guild_id = ?').get(guildId);
      if (cfg?.verified_role_id) await target.roles.add(cfg.verified_role_id).catch(() => {});
      if (cfg?.unverified_role_id) await target.roles.remove(cfg.unverified_role_id).catch(() => {});
      db.prepare('INSERT OR REPLACE INTO verified_users (guild_id, user_id, verified_at, verified_by) VALUES (?,?,?,?)').run(
        guildId, target.id, Date.now(), interaction.user.id
      );
      return interaction.reply({ embeds: [successEmbed(`**${target.user.tag}** has been manually verified.`)] });
    }

    // Check
    if (sub === 'check') {
      const target = interaction.options.getUser('user');
      const accountAgeDays = Math.floor((Date.now() - target.createdTimestamp) / 86400000);
      const isBanned = db.prepare('SELECT * FROM banned_users WHERE guild_id = ? AND user_id = ?').get(guildId, target.id);
      const isVerified = db.prepare('SELECT * FROM verified_users WHERE guild_id = ? AND user_id = ?').get(guildId, target.id);
      const warnCount = db.prepare('SELECT COUNT(*) as c FROM warnings WHERE guild_id = ? AND user_id = ?').get(guildId, target.id)?.c || 0;
      const caseCount = db.prepare('SELECT COUNT(*) as c FROM mod_cases WHERE guild_id = ? AND user_id = ?').get(guildId, target.id)?.c || 0;
      const cfg = db.prepare('SELECT * FROM verification_config WHERE guild_id = ?').get(guildId);

      const flags = [];
      if (isBanned) flags.push('🚨 **ID is on the ban evasion watchlist**');
      if (accountAgeDays < (cfg?.min_account_age_days || 7)) flags.push(`⚠️ Account is only **${accountAgeDays}** day(s) old`);
      if (warnCount > 0) flags.push(`⚠️ Has **${warnCount}** warning(s) in this server`);

      const color = flags.length > 0 ? (isBanned ? COLORS.error : COLORS.warn) : COLORS.success;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`User Check: ${target.tag}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: 'User ID', value: target.id, inline: true },
          { name: 'Account Age', value: `${accountAgeDays} days`, inline: true },
          { name: 'Verified', value: isVerified ? `✅ <t:${Math.floor(isVerified.verified_at / 1000)}:R>` : '❌ No', inline: true },
          { name: 'Warnings', value: String(warnCount), inline: true },
          { name: 'Mod Cases', value: String(caseCount), inline: true },
          { name: 'Watchlisted', value: isBanned ? `✅ Yes — ${isBanned.reason}` : '❌ No', inline: true },
          { name: flags.length ? '🚩 Flags' : '✅ No Flags', value: flags.length ? flags.join('\n') : 'This user looks clean.' },
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },
};
