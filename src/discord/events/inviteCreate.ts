import type { Invite } from 'discord.js';
import { handleInviteCreate } from '../../services/inviteTracker.js';

export function inviteCreate(invite: Invite) {
  handleInviteCreate(invite);
}