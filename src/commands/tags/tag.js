const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');

module.exports = {
  name: 'tag',
  aliases: ['t', 'tags', 'custom'],
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Custom commands / tags')
    .addSubcommand(s => s.setName('create').setDescription('Create a tag').addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true)).addStringOption(o => o.setName('content').setDescription('Tag content').setRequired(true)))
    .addSubcommand(s => s.setName('edit').setDescription('Edit a tag').addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true)).addStringOption(o => o.setName('content').setDescription('New content').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete a tag').addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true)))
    .addSubcommand(s => s.setName('info').setDescription('Tag info').addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all tags'))
    .addSubcommand(s => s.setName('use').setDescription('Use a tag').addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'use') {
      const name = interaction.options.getString('name').toLowerCase();
      const tag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (!tag) return interaction.reply({ embeds: [errorEmbed(`Tag \`${name}\` not found.`)], ephemeral: true });
      db.prepare('UPDATE tags SET uses = uses + 1 WHERE guild_id = ? AND name = ?').run(guildId, name);
      return interaction.reply({ content: tag.content });
    }

    if (sub === 'list') {
      const tags = db.prepare('SELECT name, uses FROM tags WHERE guild_id = ? ORDER BY uses DESC').all(guildId);
      if (!tags.length) return interaction.reply({ embeds: [infoEmbed('No tags created yet.')], ephemeral: true });
      const lines = tags.map(t => `\`${t.name}\` — ${t.uses} uses`);
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), `Tags (${tags.length})`)] });
    }

    if (sub === 'info') {
      const name = interaction.options.getString('name').toLowerCase();
      const tag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (!tag) return interaction.reply({ embeds: [errorEmbed(`Tag \`${name}\` not found.`)], ephemeral: true });
      const creator = await interaction.client.users.fetch(tag.creator_id).catch(() => null);
      return interaction.reply({ embeds: [infoEmbed(`**Content:** ${tag.content}\n**Created by:** ${creator?.tag || tag.creator_id}\n**Uses:** ${tag.uses}\n**Created:** <t:${Math.floor(tag.created_at / 1000)}:R>`, `Tag: ${tag.name}`)] });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [errorEmbed('You need **Manage Server** to create/edit/delete tags.')], ephemeral: true });
    }

    if (sub === 'create') {
      const name = interaction.options.getString('name').toLowerCase();
      const content = interaction.options.getString('content');
      const existing = db.prepare('SELECT 1 FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (existing) return interaction.reply({ embeds: [errorEmbed(`Tag \`${name}\` already exists. Use \`/tag edit\` to update it.`)], ephemeral: true });
      db.prepare('INSERT INTO tags (guild_id, name, content, creator_id, created_at) VALUES (?,?,?,?,?)').run(guildId, name, content, interaction.user.id, Date.now());
      return interaction.reply({ embeds: [successEmbed(`Tag \`${name}\` created. Use it with \`!${name}\` or \`/tag use ${name}\`.`)] });
    }

    if (sub === 'edit') {
      const name = interaction.options.getString('name').toLowerCase();
      const content = interaction.options.getString('content');
      const tag = db.prepare('SELECT 1 FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (!tag) return interaction.reply({ embeds: [errorEmbed(`Tag \`${name}\` not found.`)], ephemeral: true });
      db.prepare('UPDATE tags SET content = ? WHERE guild_id = ? AND name = ?').run(content, guildId, name);
      return interaction.reply({ embeds: [successEmbed(`Tag \`${name}\` updated.`)] });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name').toLowerCase();
      const tag = db.prepare('SELECT 1 FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (!tag) return interaction.reply({ embeds: [errorEmbed(`Tag \`${name}\` not found.`)], ephemeral: true });
      db.prepare('DELETE FROM tags WHERE guild_id = ? AND name = ?').run(guildId, name);
      return interaction.reply({ embeds: [successEmbed(`Tag \`${name}\` deleted.`)] });
    }
  },

  async prefixExecute(message, args) {
    const sub = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    // !tag create <name> <content>
    if (sub === 'create' || sub === 'add') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return message.reply({ embeds: [errorEmbed('Missing **Manage Server** permission.')] });
      const name = args[1]?.toLowerCase();
      const content = args.slice(2).join(' ');
      if (!name || !content) return message.reply({ embeds: [errorEmbed('Usage: `!tag create <name> <content>`')] });
      const existing = db.prepare('SELECT 1 FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (existing) return message.reply({ embeds: [errorEmbed(`Tag \`${name}\` already exists.`)] });
      db.prepare('INSERT INTO tags (guild_id, name, content, creator_id, created_at) VALUES (?,?,?,?,?)').run(guildId, name, content, message.author.id, Date.now());
      return message.reply({ embeds: [successEmbed(`Tag \`${name}\` created. Use it with \`!${name}\`.`)] });
    }

    if (sub === 'delete' || sub === 'remove') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return message.reply({ embeds: [errorEmbed('Missing **Manage Server** permission.')] });
      const name = args[1]?.toLowerCase();
      if (!name) return message.reply({ embeds: [errorEmbed('Usage: `!tag delete <name>`')] });
      db.prepare('DELETE FROM tags WHERE guild_id = ? AND name = ?').run(guildId, name);
      return message.reply({ embeds: [successEmbed(`Tag \`${name}\` deleted.`)] });
    }

    if (sub === 'list') {
      const tags = db.prepare('SELECT name FROM tags WHERE guild_id = ? ORDER BY name').all(guildId);
      if (!tags.length) return message.reply({ embeds: [infoEmbed('No tags.')] });
      return message.reply({ embeds: [infoEmbed(tags.map(t => `\`${t.name}\``).join(', '), 'Tags')] });
    }

    // !tag <name> OR !<tagname> (handled in messageCreate for direct shortcuts)
    const name = (sub || '').toLowerCase();
    if (name) {
      const tag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (tag) {
        db.prepare('UPDATE tags SET uses = uses + 1 WHERE guild_id = ? AND name = ?').run(guildId, name);
        return message.channel.send(tag.content);
      }
    }

    message.reply({ embeds: [errorEmbed('Usage: `!tag create | delete | list | <name>`')] });
  },
};
