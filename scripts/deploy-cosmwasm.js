require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Network } = require("@injectivelabs/networks");
const {
  MsgBroadcasterWithPk,
  MsgStoreCode,
  MsgInstantiateContract,
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

  const wasmPath = path.resolve(
    process.env.WASM_PATH ?? "cosmwasm/artifacts/inj_merkle_airdrop.wasm",
  );
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM not found at ${wasmPath}\nRun: npm run build:cosmwasm`);
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

  console.log("Deployer:", injAddress);

  console.log("Uploading WASM...");
  const storeMsg = MsgStoreCode.fromJSON({
    sender: injAddress,
    wasmBytes: wasm,
  });
  const storeTx = await broadcaster.broadcast({
    msgs: storeMsg,
    gas: { gas: 3_000_000 },
  });
  console.log("Store tx:", storeTx.txHash);

  const codeId = Number(readEventValue(storeTx.events, "store_code", "code_id"));
  if (!codeId) {
    throw new Error(`Could not read code_id from tx ${storeTx.txHash}`);
  }
  console.log("Code ID:", codeId);

  console.log("Instantiating contract...");
  const instantiateMsg = MsgInstantiateContract.fromJSON({
    sender: injAddress,
    admin: injAddress,
    codeId,
    label: "inj-merkle-airdrop",
    msg: {},
  });
  const instantiateTx = await broadcaster.broadcast({
    msgs: instantiateMsg,
    gas: { gas: 500_000 },
  });
  console.log("Instantiate tx:", instantiateTx.txHash);

  const contractAddress =
    readEventValue(instantiateTx.events, "instantiate", "_contract_address") ??
    readEventValue(instantiateTx.events, "wasm", "contract_address");

  if (!contractAddress) {
    throw new Error(`Could not read contract address from tx ${instantiateTx.txHash}`);
  }

  console.log("\nInj Merkle Airdrop deployed to:", contractAddress);
  console.log("\nAdd to .env and web/.env.local:");
  console.log(`NEXT_PUBLIC_AIRDROP_CONTRACT=${contractAddress}`);
  console.log(`AIRDROP_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});