export function generate8DigitCode(): string {
  // Returns an 8-digit numeric string, left-padded with zeros
  const n = Math.floor(Math.random() * 1_0000_0000); // 0..99999999
  return n.toString().padStart(8, "0");
}
