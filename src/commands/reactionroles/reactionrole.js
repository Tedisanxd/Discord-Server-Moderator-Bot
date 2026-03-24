const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');

module.exports = {
  name: 'reactionrole',
  aliases: ['rr'],
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Manage reaction roles')
    .addSubcommand(s => s.setName('add').setDescription('Add a reaction role to a message')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to assign').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel the message is in (defaults to current)')))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a reaction role')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all reaction roles'))
    .addSubcommand(s => s.setName('clear').setDescription('Clear all reaction roles from a message')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const messageId = interaction.options.getString('message_id');
      const emoji = interaction.options.getString('emoji');
      const role = interaction.options.getRole('role');
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (!msg) return interaction.reply({ embeds: [errorEmbed('Message not found in that channel.')], ephemeral: true });

      // Normalize emoji: custom emoji = id, unicode = the emoji itself
      const customMatch = emoji.match(/<a?:\w+:(\d+)>/);
      const emojiKey = customMatch ? customMatch[1] : emoji;

      db.prepare('INSERT OR REPLACE INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id) VALUES (?,?,?,?,?)').run(guildId, channel.id, messageId, emojiKey, role.id);
      await msg.react(emoji).catch(() => {});
      return interaction.reply({ embeds: [successEmbed(`Reaction role added: ${emoji} → <@&${role.id}>`)] });
    }

    if (sub === 'remove') {
      const messageId = interaction.options.getString('message_id');
      const emoji = interaction.options.getString('emoji');
      const customMatch = emoji.match(/<a?:\w+:(\d+)>/);
      const emojiKey = customMatch ? customMatch[1] : emoji;
      db.prepare('DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?').run(guildId, messageId, emojiKey);
      return interaction.reply({ embeds: [successEmbed('Reaction role removed.')] });
    }

    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?').all(guildId);
      if (!rows.length) return interaction.reply({ embeds: [infoEmbed('No reaction roles set up.')], ephemeral: true });
      const lines = rows.map(r => `<#${r.channel_id}> \`${r.message_id}\` — ${r.emoji} → <@&${r.role_id}>`);
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), 'Reaction Roles')] });
    }

    if (sub === 'clear') {
      const messageId = interaction.options.getString('message_id');
      db.prepare('DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ?').run(guildId, messageId);
      return interaction.reply({ embeds: [successEmbed('Cleared all reaction roles from that message.')] });
    }
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [errorEmbed('Missing **Manage Roles** permission.')] });

    const sub = args[0]?.toLowerCase();
    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?').all(message.guild.id);
      if (!rows.length) return message.reply({ embeds: [infoEmbed('No reaction roles configured.')] });
      const lines = rows.map(r => `<#${r.channel_id}> \`${r.message_id}\` — ${r.emoji} → <@&${r.role_id}>`);
      return message.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), 'Reaction Roles')] });
    }

    if (sub === 'add') {
      const msgId = args[1];
      const emoji = args[2];
      const role = message.mentions.roles.first();
      if (!msgId || !emoji || !role) return message.reply({ embeds: [errorEmbed('Usage: `!rr add <msgId> <emoji> @role`')] });
      const msg = await message.channel.messages.fetch(msgId).catch(() => null);
      if (!msg) return message.reply({ embeds: [errorEmbed('Message not found.')] });
      const customMatch = emoji.match(/<a?:\w+:(\d+)>/);
      const emojiKey = customMatch ? customMatch[1] : emoji;
      db.prepare('INSERT OR REPLACE INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id) VALUES (?,?,?,?,?)').run(message.guild.id, message.channel.id, msgId, emojiKey, role.id);
      await msg.react(emoji).catch(() => {});
      return message.reply({ embeds: [successEmbed(`Reaction role added: ${emoji} → <@&${role.id}>`)] });
    }

    message.reply({ embeds: [errorEmbed('Usage: `!rr add <msgId> <emoji> @role` or `!rr list`')] });
  },
};
