const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, COLORS } = require('../../utils/embed');

module.exports = {
  name: 'suggestion',
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Manage suggestion settings and responses')
    .addSubcommand(s => s.setName('channel').setDescription('Set the suggestion channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('approve').setDescription('Approve a suggestion').addStringOption(o => o.setName('message_id').setDescription('Suggestion message ID').setRequired(true)).addStringOption(o => o.setName('response').setDescription('Response')))
    .addSubcommand(s => s.setName('deny').setDescription('Deny a suggestion').addStringOption(o => o.setName('message_id').setDescription('Suggestion message ID').setRequired(true)).addStringOption(o => o.setName('response').setDescription('Response')))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      db.setConfig(guildId, 'suggestion_channel', channel.id);
      return interaction.reply({ embeds: [successEmbed(`Suggestion channel set to <#${channel.id}>.`)] });
    }

    if (sub === 'approve' || sub === 'deny') {
      const messageId = interaction.options.getString('message_id');
      const response = interaction.options.getString('response') || '';
      const suggestion = db.prepare('SELECT * FROM suggestions WHERE guild_id = ? AND message_id = ?').get(guildId, messageId);
      if (!suggestion) return interaction.reply({ embeds: [errorEmbed('Suggestion not found.')], ephemeral: true });

      const channel = interaction.guild.channels.cache.get(suggestion.channel_id);
      if (!channel) return interaction.reply({ embeds: [errorEmbed('Channel not found.')], ephemeral: true });

      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg?.embeds?.[0]) {
        const color = sub === 'approve' ? COLORS.success : COLORS.error;
        const status = sub === 'approve' ? '✅ Approved' : '❌ Denied';
        const embed = EmbedBuilder.from(msg.embeds[0])
          .setColor(color)
          .setTitle(`Suggestion — ${status}`)
          .setFooter({ text: `${status} by ${interaction.user.tag}${response ? ` | ${response}` : ''}` });
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }

      db.prepare('UPDATE suggestions SET status = ?, response = ? WHERE guild_id = ? AND message_id = ?').run(sub === 'approve' ? 'approved' : 'denied', response, guildId, messageId);
      return interaction.reply({ embeds: [successEmbed(`Suggestion ${sub === 'approve' ? 'approved' : 'denied'}.`)] });
    }
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.reply({ embeds: [errorEmbed('Missing **Manage Server** permission.')] });
    const sub = args[0]?.toLowerCase();
    if (sub === 'channel') {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply({ embeds: [errorEmbed('Mention a channel.')] });
      db.setConfig(message.guild.id, 'suggestion_channel', ch.id);
      return message.reply({ embeds: [successEmbed(`Suggestion channel set to <#${ch.id}>.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `!suggestion channel #ch`')] });
  },
};
