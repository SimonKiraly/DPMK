/** Small id / code helpers. No external uuid dependency needed. */

let counter = 0;

/** Reasonably-unique id for local records. */
export function createId(prefix = 'id'): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

/** Human-friendly ticket id, e.g. "8842-1190". */
export function createTicketId(): string {
  const block = () => String(Math.floor(1000 + Math.random() * 9000));
  return `${block()}-${block()}`;
}

/** Payment / report reference, e.g. "MHDKE-7F3A9C". */
export function createReference(prefix = 'MHDKE'): string {
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, '0');
  return `${prefix}-${hex}`;
}

/**
 * Deterministic pseudo-signature for the inspector QR payload. In production
 * this is an HMAC created server-side; here it is a stable local hash so the
 * same ticket always renders the same code.
 */
export function signTicket(ticketId: string, activatedAt: string): string {
  const input = `${ticketId}|${activatedAt}`;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}
