import { fromBech32, toBech32 } from "@cosmjs/encoding";

const INJ_PREFIX = "inj";
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const INJ_ADDRESS_RE = /^inj1[a-z0-9]{20,}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(value);
}

export function isInjAddress(value: string): boolean {
  return INJ_ADDRESS_RE.test(value);
}

export function injToEvm(address: string): `0x${string}` {
  const trimmed = address.trim();
  if (isEvmAddress(trimmed)) {
    return trimmed as `0x${string}`;
  }
  if (!isInjAddress(trimmed)) {
    throw new Error(`Invalid address (use inj1... or 0x...): ${address}`);
  }

  const { prefix, data } = fromBech32(trimmed);
  if (prefix !== INJ_PREFIX) {
    throw new Error(`Expected Injective address (inj1...), got prefix: ${prefix}`);
  }
  if (data.length !== 20) {
    throw new Error(`Invalid inj1 address length for ${address}`);
  }

  return `0x${Buffer.from(data).toString("hex")}` as `0x${string}`;
}

export function evmToInj(address: string): string {
  const trimmed = address.trim();
  if (trimmed.startsWith("inj")) return trimmed;
  if (!isEvmAddress(trimmed)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const hex = trimmed.slice(2);
  return toBech32(INJ_PREFIX, Uint8Array.from(Buffer.from(hex, "hex")));
}

export function normalizeRecipientAddress(address: string): {
  injAddress: string;
  evmAddress: `0x${string}`;
} {
  const trimmed = address.trim();
  if (isEvmAddress(trimmed)) {
    const evmAddress = trimmed as `0x${string}`;
    return { injAddress: evmToInj(evmAddress), evmAddress };
  }

  const evmAddress = injToEvm(trimmed);
  return { injAddress: trimmed, evmAddress };
}