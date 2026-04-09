export function getBrowserFingerprint(input: string): string {
  return `fp_${Buffer.from(input).toString("base64").slice(0, 24)}`;
}
