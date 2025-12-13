import { REST, Routes } from 'discord.js';
import { loadEnv } from '../src/config/env.js';
import { commands } from '../src/discord/commands/index.js';
loadEnv();
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
async function register() {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands.map((c) => c.data.toJSON()) });
    console.log('Slash commands registered');
}
register().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=registerCommands.js.map