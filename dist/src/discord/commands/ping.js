import { SlashCommandBuilder, MessageFlags } from 'discord.js';
export const ping = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Ping command'),
    async execute(interaction) {
        await interaction.reply({
            content: '🏓 Pong!',
            flags: MessageFlags.Ephemeral
        });
    }
};
//# sourceMappingURL=ping.js.map