import Decimal from "decimal.js-light";

export function computeConverted(obtained: number, fullMark: number, hasConversion: boolean, convertToMark?: number | null) {
  if (!hasConversion || !convertToMark) return round2(obtained);
  if (fullMark <= 0) return 0;
  const pct = new Decimal(obtained).div(fullMark);
  return round2(pct.mul(convertToMark).toNumber());
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
