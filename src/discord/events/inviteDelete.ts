import type { Invite } from 'discord.js';
import { handleInviteDelete } from '../../services/inviteTracker.js';

export function inviteDelete(invite: Invite) {
  handleInviteDelete(invite);
}