import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
export const ui = {
    data: new SlashCommandBuilder()
        .setName('ui')
        .setDescription('UI demo: button routing example'),
    async execute(interaction) {
        const id = buildCustomId('demo', 'hello');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId(id)
            .setLabel('Say hello')
            .setStyle(ButtonStyle.Primary));
        await interaction.reply({
            content: 'UI demo: нажми кнопку ниже.',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
};
//# sourceMappingURL=ui.js.map