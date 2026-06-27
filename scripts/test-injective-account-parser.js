/**
 * Quick sanity check: fetch an Injective testnet account and parse EthAccount.
 * Run: node scripts/test-injective-account-parser.js
 */
const { Tendermint34Client } = require("@cosmjs/tendermint-rpc");
const { QueryClient, createProtobufRpcClient } = require("@cosmjs/stargate");
const { QueryClientImpl } = require("cosmjs-types/cosmos/auth/v1beta1/query");
const { accountFromAny } = require("@cosmjs/stargate");

const ETH_ACCOUNT_TYPE_URL = "/injective.types.v1beta1.EthAccount";

function readVarint(data, offset) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < data.length) {
    const byte = data[pos++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [result, pos];
    shift += 7;
  }
  throw new Error("Invalid varint");
}

function skipField(data, offset, wireType) {
  switch (wireType) {
    case 0: {
      const [, next] = readVarint(data, offset);
      return next;
    }
    case 2: {
      const [len, next] = readVarint(data, offset);
      return next + len;
    }
    case 5:
      return offset + 4;
    case 1:
      return offset + 8;
    default:
      throw new Error(`Unsupported wire type ${wireType}`);
  }
}

function extractLengthDelimitedField(data, fieldNumber) {
  let offset = 0;
  while (offset < data.length) {
    const [tag, next] = readVarint(data, offset);
    offset = next;
    const currentField = tag >>> 3;
    const wireType = tag & 0x7;
    if (currentField === fieldNumber && wireType === 2) {
      const [len, dataOffset] = readVarint(data, offset);
      return data.slice(dataOffset, dataOffset + len);
    }
    offset = skipField(data, offset, wireType);
  }
  return undefined;
}

function decodeInjectivePubkey(pubKey) {
  if (!pubKey?.typeUrl || !pubKey.value?.length) return null;
  if (pubKey.typeUrl === "/injective.crypto.v1beta1.ethsecp256k1.PubKey") {
    const { encodeSecp256k1Pubkey } = require("@cosmjs/amino");
    const keyBytes = extractLengthDelimitedField(pubKey.value, 1);
    if (!keyBytes?.length) return null;
    return encodeSecp256k1Pubkey(keyBytes);
  }
  const { decodeOptionalPubkey } = require("@cosmjs/proto-signing");
  try {
    return decodeOptionalPubkey(pubKey);
  } catch {
    return null;
  }
}

function injectiveAccountFromAny(input) {
  if (input.typeUrl !== ETH_ACCOUNT_TYPE_URL) {
    return accountFromAny(input);
  }
  const { BaseAccount } = require("cosmjs-types/cosmos/auth/v1beta1/auth");
  const { Uint64 } = require("@cosmjs/math");
  const baseAccountBytes = extractLengthDelimitedField(input.value, 1);
  if (!baseAccountBytes) throw new Error("EthAccount missing base_account");
  const base = BaseAccount.decode(baseAccountBytes);
  return {
    address: base.address,
    pubkey: decodeInjectivePubkey(base.pubKey),
    accountNumber: Uint64.fromString(base.accountNumber.toString()).toNumber(),
    sequence: Uint64.fromString(base.sequence.toString()).toNumber(),
  };
}

async function main() {
  const address = "inj12ms4zs769a6dynlhewfquesrzdnsmmjs6yuy2l";
  const rpc = "https://testnet.sentry.tm.injective.network:443";

  const tm = await Tendermint34Client.connect(rpc);
  const query = new QueryClient(tm);
  const rpcClient = createProtobufRpcClient(query);
  const auth = new QueryClientImpl(rpcClient);

  const { account } = await auth.Account({ address });
  if (!account) throw new Error("Account not found");

  console.log("typeUrl:", account.typeUrl);
  if (account.typeUrl !== ETH_ACCOUNT_TYPE_URL) {
    throw new Error(`Expected EthAccount, got ${account.typeUrl}`);
  }

  try {
    accountFromAny(account);
    throw new Error("Default CosmJS parser should have failed");
  } catch (error) {
    console.log("Default parser error (expected):", error.message);
  }

  const parsed = injectiveAccountFromAny(account);
  console.log("Parsed account:", parsed);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});