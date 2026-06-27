const { fromBech32, toBech32 } = require("@cosmjs/encoding");

const INJ_PREFIX = "inj";
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const INJ_ADDRESS_RE = /^inj1[a-z0-9]{20,}$/;

function isEvmAddress(value) {
  return EVM_ADDRESS_RE.test(value);
}

function isInjAddress(value) {
  return INJ_ADDRESS_RE.test(value);
}

function injToEvm(address) {
  const trimmed = address.trim();
  if (isEvmAddress(trimmed)) return trimmed;
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

  return `0x${Buffer.from(data).toString("hex")}`;
}

function evmToInj(address) {
  const trimmed = address.trim();
  if (trimmed.startsWith("inj")) return trimmed;
  if (!isEvmAddress(trimmed)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const hex = trimmed.slice(2);
  return toBech32(INJ_PREFIX, Uint8Array.from(Buffer.from(hex, "hex")));
}

function normalizeRecipientAddress(address) {
  const trimmed = address.trim();
  if (isEvmAddress(trimmed)) {
    return { injAddress: evmToInj(trimmed), evmAddress: trimmed };
  }

  const evmAddress = injToEvm(trimmed);
  return { injAddress: trimmed, evmAddress };
}

module.exports = {
  normalizeRecipientAddress,
  injToEvm,
  evmToInj,
};