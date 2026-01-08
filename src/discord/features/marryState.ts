const activeProposals = new Set<string>();

export function markMarryProposalActive(messageId: string) {
  activeProposals.add(messageId);
}

export function clearMarryProposal(messageId: string) {
  activeProposals.delete(messageId);
}

export function isMarryProposalActive(messageId: string) {
  return activeProposals.has(messageId);
}