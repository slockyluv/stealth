import { Client, GatewayIntentBits } from 'discord.js';
import { commands } from './commands/index.js';
import { buttonHandlers } from './components/buttons/index.js';
import { modalHandlers } from './components/modals/index.js';
import { selectMenuHandlers } from './components/selectMenus/index.js';
export function createClient() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences
        ]
    });
    client.commands = new Map();
    for (const command of commands) {
        client.commands.set(command.data.name, command);
    }
    client.buttons = new Map();
    for (const h of buttonHandlers) {
        client.buttons.set(h.key, h);
    }
    client.modals = new Map();
    for (const h of modalHandlers) {
        client.modals.set(h.key, h);
    }
    client.selectMenus = new Map();
    for (const h of selectMenuHandlers) {
        client.selectMenus.set(h.key, h);
    }
    return client;
}
//# sourceMappingURL=client.js.map