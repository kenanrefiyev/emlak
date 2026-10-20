/** A Date `days` from now (negative for the past). Kept out of components so render stays pure. */
export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}
