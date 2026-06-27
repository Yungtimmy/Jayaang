import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { SigningCosmWasmClient, type SigningCosmWasmClientOptions } from "@cosmjs/cosmwasm-stargate";
import { patchSigningCosmWasmClientForInjective } from "./injective-signing";
import { Uint64 } from "@cosmjs/math";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import { decodeOptionalPubkey } from "@cosmjs/proto-signing";
import { accountFromAny, type Account } from "@cosmjs/stargate";
import { connectComet, type CometClient, type HttpEndpoint } from "@cosmjs/tendermint-rpc";
import { BaseAccount } from "cosmjs-types/cosmos/auth/v1beta1/auth";
import type { Any } from "cosmjs-types/google/protobuf/any";

const ETH_ACCOUNT_TYPE_URL = "/injective.types.v1beta1.EthAccount";
const ETH_SECP256K1_PUBKEY_TYPE_URL = "/injective.crypto.v1beta1.ethsecp256k1.PubKey";

function readVarint(data: Uint8Array, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let pos = offset;

  while (pos < data.length) {
    const byte = data[pos++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [result, pos];
    shift += 7;
  }

  throw new Error("Invalid varint in EthAccount");
}

function skipField(data: Uint8Array, offset: number, wireType: number): number {
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

function extractLengthDelimitedField(data: Uint8Array, fieldNumber: number): Uint8Array | undefined {
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

function decodeInjectivePubkey(pubKey: Any | undefined): Account["pubkey"] {
  if (!pubKey?.typeUrl || !pubKey.value?.length) return null;

  if (pubKey.typeUrl === ETH_SECP256K1_PUBKEY_TYPE_URL) {
    const keyBytes = extractLengthDelimitedField(pubKey.value, 1);
    if (!keyBytes?.length) return null;
    return encodeSecp256k1Pubkey(keyBytes);
  }

  try {
    return decodeOptionalPubkey(pubKey);
  } catch {
    return null;
  }
}

function accountFromBaseAccount(base: BaseAccount): Account {
  return {
    address: base.address,
    pubkey: decodeInjectivePubkey(base.pubKey),
    accountNumber: Uint64.fromString(base.accountNumber.toString()).toNumber(),
    sequence: Uint64.fromString(base.sequence.toString()).toNumber(),
  };
}

/**
 * Injective uses EthAccount instead of the standard Cosmos BaseAccount.
 * CosmJS only understands BaseAccount by default, so we unwrap EthAccount first.
 */
export function injectiveAccountFromAny(input: Any): Account {
  if (input.typeUrl !== ETH_ACCOUNT_TYPE_URL) {
    return accountFromAny(input);
  }

  const baseAccountBytes = extractLengthDelimitedField(input.value, 1);
  if (!baseAccountBytes) {
    throw new Error("EthAccount missing base_account");
  }

  return accountFromBaseAccount(BaseAccount.decode(baseAccountBytes));
}

/**
 * CosmWasmClient hardcodes the default account parser and ignores accountParser options.
 * Override getAccount so Injective EthAccount addresses can sign transactions.
 */
patchSigningCosmWasmClientForInjective();

export class InjectiveSigningCosmWasmClient extends SigningCosmWasmClient {
  static async connectWithSigner(
    endpoint: string | HttpEndpoint,
    signer: OfflineSigner,
    options: SigningCosmWasmClientOptions = {},
  ): Promise<InjectiveSigningCosmWasmClient> {
    const cometClient = await connectComet(endpoint);
    return InjectiveSigningCosmWasmClient.createWithSigner(cometClient, signer, options);
  }

  static async createWithSigner(
    cometClient: CometClient,
    signer: OfflineSigner,
    options: SigningCosmWasmClientOptions = {},
  ): Promise<InjectiveSigningCosmWasmClient> {
    return new InjectiveSigningCosmWasmClient(cometClient, signer, options);
  }

  override async getAccount(searchAddress: string): Promise<Account | null> {
    try {
      const account = await this.forceGetQueryClient().auth.account(searchAddress);
      return account ? injectiveAccountFromAny(account) : null;
    } catch (error) {
      if (/rpc error: code = NotFound/i.test(String(error))) {
        return null;
      }
      throw error;
    }
  }
}