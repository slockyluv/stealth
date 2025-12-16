import { ready } from './ready.js';
import { interactionCreate } from './interactionCreate.js';
import { guildMemberAdd } from './guildMemberAdd.js';
export function registerEvents(client) {
    client.once('clientReady', ready);
    client.on('interactionCreate', interactionCreate);
    client.on('guildMemberAdd', guildMemberAdd);
}
//# sourceMappingURL=index.js.map