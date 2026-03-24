const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');

module.exports = {
  name: 'welcome',
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome and leave messages')
    .addSubcommand(s => s.setName('show').setDescription('Show current welcome settings'))
    .addSubcommand(s => s.setName('channel').setDescription('Set welcome channel').addChannelOption(o => o.setName('channel').setDescription('Channel (leave empty to disable)').setRequired(false)))
    .addSubcommand(s => s.setName('message').setDescription('Set welcome message').addStringOption(o => o.setName('message').setDescription('Use {user}, {username}, {server}, {membercount}').setRequired(true)))
    .addSubcommand(s => s.setName('dm').setDescription('Set DM welcome message').addStringOption(o => o.setName('message').setDescription('DM message (leave empty to disable)').setRequired(false)))
    .addSubcommand(s => s.setName('leave').setDescription('Configure leave messages').addChannelOption(o => o.setName('channel').setDescription('Leave channel').setRequired(false)).addStringOption(o => o.setName('message').setDescription('Leave message').setRequired(false)))
    .addSubcommand(s => s.setName('test').setDescription('Test the welcome message'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const cfg = db.getConfig(guildId);

    if (sub === 'show') {
      const lines = [
        `**Welcome Channel:** ${cfg.welcome_channel ? `<#${cfg.welcome_channel}>` : 'Not set'}`,
        `**Welcome Message:** ${cfg.welcome_message || 'Default'}`,
        `**Welcome DM:** ${cfg.welcome_dm || 'Off'}`,
        `**Leave Channel:** ${cfg.leave_channel ? `<#${cfg.leave_channel}>` : 'Not set'}`,
        `**Leave Message:** ${cfg.leave_message || 'Default'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n'), 'Welcome Settings')] });
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      db.setConfig(guildId, 'welcome_channel', channel?.id || null);
      return interaction.reply({ embeds: [successEmbed(channel ? `Welcome channel set to <#${channel.id}>.` : 'Welcome channel disabled.')] });
    }

    if (sub === 'message') {
      const msg = interaction.options.getString('message');
      db.setConfig(guildId, 'welcome_message', msg);
      return interaction.reply({ embeds: [successEmbed(`Welcome message updated.\nPreview: ${msg}`)] });
    }

    if (sub === 'dm') {
      const msg = interaction.options.getString('message');
      db.setConfig(guildId, 'welcome_dm', msg || null);
      return interaction.reply({ embeds: [successEmbed(msg ? `DM welcome message set.` : 'DM welcome message disabled.')] });
    }

    if (sub === 'leave') {
      const channel = interaction.options.getChannel('channel');
      const msg = interaction.options.getString('message');
      if (channel) db.setConfig(guildId, 'leave_channel', channel.id);
      if (msg) db.setConfig(guildId, 'leave_message', msg);
      return interaction.reply({ embeds: [successEmbed('Leave settings updated.')] });
    }

    if (sub === 'test') {
      if (!cfg.welcome_channel) return interaction.reply({ embeds: [errorEmbed('No welcome channel set.')], ephemeral: true });
      const channel = interaction.guild.channels.cache.get(cfg.welcome_channel);
      if (!channel) return interaction.reply({ embeds: [errorEmbed('Welcome channel not found.')], ephemeral: true });
      const msg = (cfg.welcome_message || 'Welcome {user}!')
        .replace(/{user}/g, `<@${interaction.user.id}>`)
        .replace(/{username}/g, interaction.user.username)
        .replace(/{server}/g, interaction.guild.name)
        .replace(/{membercount}/g, interaction.guild.memberCount);
      await channel.send(msg);
      return interaction.reply({ embeds: [successEmbed('Test message sent!')], ephemeral: true });
    }
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.reply({ embeds: [errorEmbed('Missing **Manage Server** permission.')] });
    const cfg = db.getConfig(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const lines = [
        `**Channel:** ${cfg.welcome_channel ? `<#${cfg.welcome_channel}>` : 'Not set'}`,
        `**Message:** ${cfg.welcome_message || 'Default'}`,
      ];
      return message.reply({ embeds: [infoEmbed(lines.join('\n'), 'Welcome Settings')] });
    }
    if (sub === 'channel') {
      const ch = message.mentions.channels.first();
      db.setConfig(message.guild.id, 'welcome_channel', ch?.id || null);
      return message.reply({ embeds: [successEmbed(ch ? `Welcome channel set to <#${ch.id}>.` : 'Cleared.')] });
    }
    if (sub === 'message') {
      const msg = args.slice(1).join(' ');
      if (!msg) return message.reply({ embeds: [errorEmbed('Provide a message.')] });
      db.setConfig(message.guild.id, 'welcome_message', msg);
      return message.reply({ embeds: [successEmbed('Welcome message updated.')] });
    }
    if (sub === 'leave') {
      const ch = message.mentions.channels.first();
      const msg = args.slice(ch ? 2 : 1).join(' ');
      if (ch) db.setConfig(message.guild.id, 'leave_channel', ch.id);
      if (msg) db.setConfig(message.guild.id, 'leave_message', msg);
      return message.reply({ embeds: [successEmbed('Leave settings updated.')] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `!welcome channel #ch | message <text> | leave`')] });
  },
};
