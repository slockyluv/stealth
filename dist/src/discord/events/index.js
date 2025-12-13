import { ready } from './ready.js';
import { interactionCreate } from './interactionCreate.js';
export function registerEvents(client) {
    client.once('clientReady', ready);
    client.on('interactionCreate', interactionCreate);
}
//# sourceMappingURL=index.js.map