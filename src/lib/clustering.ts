export function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b
  let count = 0
  while (xor > 0n) { count += Number(xor & 1n); xor >>= 1n }
  return count
}
