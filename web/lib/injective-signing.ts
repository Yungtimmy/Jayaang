import { isSecp256k1Pubkey, type Pubkey } from "@cosmjs/amino";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fromBase64Padded, toWalletBytes } from "./bytes";
import { Int53 } from "@cosmjs/math";
import type { EncodeObject, OfflineSigner } from "@cosmjs/proto-signing";
import {
  isOfflineDirectSigner,
  makeAuthInfoBytes,
  makeSignDoc,
} from "@cosmjs/proto-signing";
import type { SignerData, StdFee } from "@cosmjs/stargate";
import { assert } from "@cosmjs/utils";
import { makeSignDoc as makeAminoSignDoc, type AminoMsg } from "@cosmjs/amino";
import { PubKey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Any } from "cosmjs-types/google/protobuf/any";

const ETH_SECP256K1_PUBKEY_TYPE_URL = "/injective.crypto.v1beta1.ethsecp256k1.PubKey";

type PatchedSigningClient = {
  signer: OfflineSigner;
  aminoTypes: {
    toAmino: (msg: EncodeObject) => unknown;
    fromAmino: (msg: unknown) => EncodeObject;
  };
  registry: {
    encode: (obj: EncodeObject) => Uint8Array;
  };
};

function accountPubkeyToBytes(pubkey: Uint8Array | Pubkey): Uint8Array {
  if (pubkey instanceof Uint8Array) {
    return pubkey;
  }
  if (isSecp256k1Pubkey(pubkey)) {
    return fromBase64Padded(pubkey.value);
  }
  throw new Error(`Unsupported wallet pubkey type: ${pubkey.type}`);
}

/** Injective expects ethsecp256k1 pubkeys in tx auth info, not cosmos secp256k1. */
export function encodeInjectivePubkey(pubkey: Uint8Array | Pubkey): Any {
  const rawKey = accountPubkeyToBytes(pubkey);
  const proto = PubKey.fromPartial({ key: rawKey });
  return Any.fromPartial({
    typeUrl: ETH_SECP256K1_PUBKEY_TYPE_URL,
    value: Uint8Array.from(PubKey.encode(proto).finish()),
  });
}

let signingPatched = false;

export function patchSigningCosmWasmClientForInjective(): void {
  if (signingPatched) return;
  signingPatched = true;

  // CosmJS marks signDirect/signAmino private; patch at runtime for Injective pubkeys.
  const prototype = SigningCosmWasmClient.prototype as unknown as Record<string, unknown>;

  prototype.signDirect = async function (
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    { accountNumber, sequence, chainId }: SignerData,
    timeoutHeight?: bigint,
  ) {
    const client = this as unknown as PatchedSigningClient;
    assert(isOfflineDirectSigner(client.signer));
    const accountFromSigner = (await client.signer.getAccounts()).find(
      (account) => account.address === signerAddress,
    );
    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }

    const pubkey = encodeInjectivePubkey(accountFromSigner.pubkey);
    const txBody = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages,
        memo,
        timeoutHeight,
      },
    };
    const txBodyBytes = client.registry.encode(txBody);
    const gasLimit = Int53.fromString(fee.gas).toNumber();
    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence }],
      fee.amount,
      gasLimit,
      fee.granter,
      fee.payer,
    );
    const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);
    const { signature, signed } = await client.signer.signDirect(signerAddress, signDoc);
    if (!signature.signature) {
      throw new Error("Keplr did not return a transaction signature");
    }
    return TxRaw.fromPartial({
      bodyBytes: toWalletBytes(signed.bodyBytes),
      authInfoBytes: toWalletBytes(signed.authInfoBytes),
      signatures: [toWalletBytes(signature.signature)],
    });
  };

  prototype.signAmino = async function signAminoWithInjectivePubkey(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    { accountNumber, sequence, chainId }: SignerData,
    timeoutHeight?: bigint,
  ) {
    const client = this as unknown as PatchedSigningClient;
    assert(!isOfflineDirectSigner(client.signer));
    const accountFromSigner = (await client.signer.getAccounts()).find(
      (account) => account.address === signerAddress,
    );
    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }

    const pubkey = encodeInjectivePubkey(accountFromSigner.pubkey);
    const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
    const msgs = messages.map((msg) => client.aminoTypes.toAmino(msg)) as AminoMsg[];
    const signDoc = makeAminoSignDoc(msgs, fee, chainId, memo, accountNumber, sequence, timeoutHeight);
    const { signature, signed } = await client.signer.signAmino(signerAddress, signDoc);
    const signedTxBody = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: signed.msgs.map((msg) => client.aminoTypes.fromAmino(msg as AminoMsg)),
        memo: signed.memo,
        timeoutHeight,
      },
    };
    const signedTxBodyBytes = client.registry.encode(signedTxBody);
    const signedGasLimit = Int53.fromString(signed.fee.gas).toNumber();
    const signedSequence = Int53.fromString(signed.sequence).toNumber();
    // Auth info sequence must match the amino sign doc Keplr actually signed.
    const signedAuthInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence: signedSequence }],
      signed.fee.amount,
      signedGasLimit,
      signed.fee.granter,
      signed.fee.payer,
      signMode,
    );
    if (!signature.signature) {
      throw new Error("Keplr did not return a transaction signature");
    }

    return TxRaw.fromPartial({
      bodyBytes: signedTxBodyBytes,
      authInfoBytes: signedAuthInfoBytes,
      signatures: [toWalletBytes(signature.signature)],
    });
  };
}