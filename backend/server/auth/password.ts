import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string) {
  if (!hash.startsWith("$2")) return false; // disabled / placeholder hashes
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | null = null;

/** Same bcrypt work when the email is unknown, so timing does not reveal accounts. */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= bcrypt.hash("not-a-real-password", COST);
  await bcrypt.compare(password, await dummyHash);
}
