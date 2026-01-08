import { ping } from './ping.js';
import { clear } from './clear.js';
import { ui } from './ui.js';
import { server } from './server.js';
import { settings } from './settings.js';
import { mute, unmute } from './mute.js';
import { mutes } from './mutes.js';
import { ban, unban } from './ban.js';
import { kick } from './kick.js';
import { setnick } from './setnick.js';
import { addRole, takeRole, tempRole } from './roles.js';
import { nabor } from './nabor.js';
import { reg } from './reg.js';
import { regCountry, unreg } from './regCountry.js';
import { profile } from './profile.js';
import { finance } from './finance.js';
import { giveMoney, takeMoney, resetMoney } from './money.js';
import { ownerpanel } from './ownerpanel.js';
import { stats } from './stats.js';
import { marry } from './marry.js';

export const commands = [
  ping,
  clear,
  ui,
  server,
  settings,
  mute,
  unmute,
  mutes,
  ban,
  unban,
  kick,
  setnick,
  nabor,
  addRole,
  takeRole,
  tempRole,
  reg,
  regCountry,
  unreg,
  profile,
  finance,
  giveMoney,
  takeMoney,
  resetMoney,
  ownerpanel,
  stats,
  marry
];