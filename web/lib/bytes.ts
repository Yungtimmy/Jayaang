import * as cosmjsEncoding from "@cosmjs/encoding";

const decodeBase64 = cosmjsEncoding.fromBase64;

let cosmjsEncodingPatched = false;

/** Injective/Tendermint often omit base64 padding; CosmJS strict decoder fails after broadcast. */
export function patchCosmjsEncoding(): void {
  if (cosmjsEncodingPatched) return;
  cosmjsEncodingPatched = true;
  Object.defineProperty(cosmjsEncoding, "fromBase64", {
    value: fromBase64Padded,
    writable: true,
    configurable: true,
  });
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** CosmWasm Binary fields must be base64 strings in JSON execute messages. */
export function hexToBase64(hex: string): string {
  const bytes = hexToBytes(hex);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Keplr, LCD, and CosmWasm queries often omit base64 padding; CosmJS requires it. */
export function fromBase64Padded(value: string): Uint8Array {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Expected base64 string, got empty value");
  }

  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return hexToBytes(trimmed);
  }

  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return decodeBase64(padded);
}

/** Normalize wallet/CosmJS fields that may be Uint8Array, hex, or unpadded base64. */
export function toWalletBytes(value: string | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  return fromBase64Padded(value);
}