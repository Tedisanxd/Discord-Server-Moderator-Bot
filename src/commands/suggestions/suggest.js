const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embed');

module.exports = {
  name: 'suggest',
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(o => o.setName('suggestion').setDescription('Your suggestion').setRequired(true)),

  async execute(interaction) {
    const content = interaction.options.getString('suggestion');
    const cfg = db.getConfig(interaction.guild.id);

    if (!cfg.suggestion_channel) {
      return interaction.reply({ embeds: [errorEmbed('No suggestion channel configured. Ask an admin to set one up.')], ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(cfg.suggestion_channel);
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Suggestion channel not found.')], ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('New Suggestion')
      .setDescription(content)
      .addFields({ name: 'Submitted by', value: `${interaction.user.tag} (${interaction.user.id})` })
      .setFooter({ text: 'React with ✅ or ❌ to vote!' })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react('✅');
    await msg.react('❌');

    db.prepare('INSERT INTO suggestions (guild_id, channel_id, message_id, user_id, content, timestamp) VALUES (?,?,?,?,?,?)').run(
      interaction.guild.id, channel.id, msg.id, interaction.user.id, content, Date.now()
    );

    await interaction.reply({ embeds: [successEmbed('Your suggestion has been submitted!')], ephemeral: true });
  },

  async prefixExecute(message, args) {
    const content = args.join(' ');
    if (!content) return message.reply({ embeds: [errorEmbed('Please provide a suggestion.')] });
    const cfg = db.getConfig(message.guild.id);
    if (!cfg.suggestion_channel) return message.reply({ embeds: [errorEmbed('No suggestion channel set.')] });
    const channel = message.guild.channels.cache.get(cfg.suggestion_channel);
    if (!channel) return message.reply({ embeds: [errorEmbed('Suggestion channel not found.')] });

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('New Suggestion')
      .setDescription(content)
      .addFields({ name: 'Submitted by', value: `${message.author.tag}` })
      .setFooter({ text: 'React with ✅ or ❌ to vote!' })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react('✅');
    await msg.react('❌');

    db.prepare('INSERT INTO suggestions (guild_id, channel_id, message_id, user_id, content, timestamp) VALUES (?,?,?,?,?,?)').run(
      message.guild.id, channel.id, msg.id, message.author.id, content, Date.now()
    );

    const reply = await message.reply({ embeds: [successEmbed('Suggestion submitted!')] });
    setTimeout(() => reply.delete().catch(() => {}), 5000);
  },
};
