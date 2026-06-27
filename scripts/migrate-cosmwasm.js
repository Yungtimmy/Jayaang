require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Network } = require("@injectivelabs/networks");
const {
  MsgBroadcasterWithPk,
  MsgStoreCode,
  MsgMigrateContract,
  PrivateKey,
} = require("@injectivelabs/sdk-ts");

function readEventValue(events, type, key) {
  if (!events) return undefined;
  for (const event of events) {
    if (event.type !== type) continue;
    const attr = event.attributes?.find((entry) => entry.key === key);
    if (attr?.value) return attr.value;
  }
  return undefined;
}

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env");
  }

  const contract = process.env.AIRDROP_CONTRACT_ADDRESS;
  if (!contract?.startsWith("inj1")) {
    throw new Error("Missing AIRDROP_CONTRACT_ADDRESS in .env");
  }

  const wasmPath = path.resolve(
    process.env.WASM_PATH ?? "cosmwasm/artifacts/inj_merkle_airdrop.wasm",
  );
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM not found at ${wasmPath}`);
  }

  const wasm = fs.readFileSync(wasmPath);
  const privateKeyHex = process.env.PRIVATE_KEY.startsWith("0x")
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`;
  const privateKey = PrivateKey.fromHex(privateKeyHex);
  const injAddress = privateKey.toBech32();

  const broadcaster = new MsgBroadcasterWithPk({
    privateKey: privateKeyHex,
    network: Network.Testnet,
    simulateTx: true,
    gasBufferCoefficient: 1.3,
  });

  console.log("Migrating contract:", contract);
  console.log("Admin:", injAddress);

  console.log("Uploading fixed WASM...");
  const storeMsg = MsgStoreCode.fromJSON({
    sender: injAddress,
    wasmBytes: wasm,
  });
  const storeTx = await broadcaster.broadcast({
    msgs: storeMsg,
    gas: { gas: 3_000_000 },
  });
  const codeId = Number(readEventValue(storeTx.events, "store_code", "code_id"));
  if (!codeId) {
    throw new Error(`Could not read code_id from tx ${storeTx.txHash}`);
  }
  console.log("New code ID:", codeId);

  console.log("Migrating live contract...");
  const migrateMsg = MsgMigrateContract.fromJSON({
    sender: injAddress,
    contract,
    codeId,
    msg: {},
  });
  const migrateTx = await broadcaster.broadcast({
    msgs: migrateMsg,
    gas: { gas: 1_000_000 },
  });
  console.log("Migrate tx:", migrateTx.txHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});