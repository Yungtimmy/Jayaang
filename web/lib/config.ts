export function getContractAddress(): string | undefined {
  const value = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT?.trim();
  if (!value || !/^inj1[a-z0-9]{20,}$/.test(value)) return undefined;
  return value;
}