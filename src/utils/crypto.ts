import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(password: string) {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hashStr: string, password: string) {
  return verify(hashStr, password);
}
