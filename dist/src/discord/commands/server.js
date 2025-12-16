import { SlashCommandBuilder, EmbedBuilder, ChannelType, userMention } from 'discord.js';
import { logger } from '../../shared/logger.js';
const numberFormatter = new Intl.NumberFormat('ru-RU');
function formatFullDateTime(date) {
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}
function formatRequestTimestamp(date) {
    const now = new Date();
    const midnightNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const midnightTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.floor((midnightNow.getTime() - midnightTarget.getTime()) / 86_400_000);
    const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
    if (dayDiff === 0) {
        return `Сегодня, ${time}`;
    }
    if (dayDiff === 1) {
        return `Вчера, ${time}`;
    }
    const datePart = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
    return `${datePart}, ${time}`;
}
export const server = {
    data: new SlashCommandBuilder().setName('server').setDescription('Показывает информацию о сервере'),
    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply({
                content: 'Эта команда доступна только на сервере.'
            });
            return;
        }
        await interaction.deferReply();
        try {
            const [members, channels, emojis] = await Promise.all([
                interaction.guild.members.fetch({ withPresences: true }),
                interaction.guild.channels.fetch(),
                interaction.guild.emojis.fetch()
            ]);
            const validChannels = channels.filter((channel) => channel !== null);
            const totalMembers = interaction.guild.memberCount;
            const botCount = members.filter((member) => member.user.bot).size;
            const humanCount = Math.max(totalMembers - botCount, 0);
            let online = 0;
            let idle = 0;
            let dnd = 0;
            for (const member of members.values()) {
                const status = member.presence?.status ?? 'offline';
                if (status === 'online')
                    online += 1;
                else if (status === 'idle')
                    idle += 1;
                else if (status === 'dnd')
                    dnd += 1;
            }
            const offline = Math.max(totalMembers - online - idle - dnd, 0);
            const voiceChannels = validChannels.filter((channel) => channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice).size;
            const textChannels = validChannels.filter((channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement).size;
            const totalChannels = validChannels.filter((channel) => channel.isTextBased() || channel.isVoiceBased()).size;
            const ownerMention = userMention(interaction.guild.ownerId);
            const embed = new EmbedBuilder()
                .setAuthor({
                name: interaction.guild.name,
                iconURL: interaction.guild.iconURL({ size: 64 }) ?? undefined
            })
                .setTitle('<:information:1446810596040507505> Информация о сервере')
                .setColor(0x5865f2)
                .setDescription([
                '> **<:family:1446810283703271484> Участники**',
                `<:more:1446810368570560572> ➜  Всего: \`${numberFormatter.format(totalMembers)}\``,
                `<:bots:1446810531527655454> ➜  Ботов: \`${numberFormatter.format(botCount)}\``,
                `<:user:1446810410786357430> ➜  Людей: \`${numberFormatter.format(humanCount)}\``,
                '',
                '> **<:channel:1446810583201484812> Каналы**',
                `<:voice_chat:1446810661769314416> ➜  Голосовые: \`${numberFormatter.format(voiceChannels)}\``,
                `<:message:1446810566076268558> ➜  Текстовые: \`${numberFormatter.format(textChannels)}\``,
                `<:more:1446810368570560572> ➜  Всего: \`${numberFormatter.format(totalChannels)}\``,
                '',
                '> **<:star:1446810292226097213> Статусы пользователей**',
                `<:online:1446810473944055940> ➜  В сети: \`${numberFormatter.format(online)}\``,
                `<:noactive:1450507067344421016> ➜  Неактивны: \`${numberFormatter.format(idle)}\``,
                `<:disturb:1450506236192882729> ➜  Не беспокоить: \`${numberFormatter.format(dnd)}\``,
                `<:offline:1450507527736266824> ➜  Не в сети: \`${numberFormatter.format(offline)}\``,
                '',
                '> **<:list:1446810426896683153> Сервер**',
                `<:action_profile:1446810638759497738> ➜  Бустов: \`${numberFormatter.format(interaction.guild.premiumSubscriptionCount ?? 0)}\``,
                `<:clock:1446810203373834262> ➜  Сервер создан: \`${formatFullDateTime(interaction.guild.createdAt)}\``,
                `<:promo:1446810450967789678> ➜  Всего эмодзи: \`${numberFormatter.format(emojis.size)}\``,
                `<:owner:1446810194406412429> ➜  Владелец сервера: ${ownerMention}`
            ].join('\n'))
                .setFooter({
                text: `Запрос от: ${interaction.user.username} • ${formatRequestTimestamp(new Date())}`
            });
            await interaction.editReply({ embeds: [embed] });
        }
        catch (error) {
            logger.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: 'Не удалось получить информацию о сервере. Попробуйте позже.',
                    embeds: []
                });
            }
            else {
                await interaction.reply({
                    content: 'Не удалось получить информацию о сервере. Попробуйте позже.'
                });
            }
        }
    }
};
//# sourceMappingURL=server.js.map