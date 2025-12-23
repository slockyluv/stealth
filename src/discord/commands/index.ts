import { ping } from './ping.js';
import { ui } from './ui.js';
import { server } from './server.js';
import { settings } from './settings.js';
import { mute, unmute } from './mute.js';
import { mutes } from './mutes.js';
import { ban, unban } from './ban.js';
import { kick } from './kick.js';

export const commands = [ping, ui, server, settings, mute, unmute, mutes, ban, unban, kick];