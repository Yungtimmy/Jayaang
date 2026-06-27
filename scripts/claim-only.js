require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Network } = require("@injectivelabs/networks");
const { MsgBroadcasterWithPk, MsgExecuteContract, PrivateKey } = require("@injectivelabs/sdk-ts");

function hexToBase64(hex) {
  return Buffer.from(hex.replace(/^0x/, ""), "hex").toString("base64");
}

async function main() {
  const contract = process.env.AIRDROP_CONTRACT_ADDRESS;
  const campaignId = Number(process.argv[2] ?? "0");
  const merklePath = path.resolve(process.argv[3] ?? "test-output/merkle.json");

  const hex = process.env.PRIVATE_KEY.startsWith("0x")
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`;
  const addr = PrivateKey.fromHex(hex).toBech32();
  const artifact = JSON.parse(fs.readFileSync(merklePath, "utf8"));
  const entry = artifact.proofs[addr.toLowerCase()];
  if (!entry) throw new Error(`No proof for ${addr}`);

  const broadcaster = new MsgBroadcasterWithPk({
    privateKey: hex,
    network: Network.Testnet,
    simulateTx: true,
    gasBufferCoefficient: 1.3,
  });

  const claimMsg = MsgExecuteContract.fromJSON({
    sender: addr,
    contractAddress: contract,
    msg: {
      claim: {
        campaign_id: campaignId,
        amount: entry.amount,
        proof: entry.proof.map((step) => hexToBase64(step)),
      },
    },
  });

  const tx = await broadcaster.broadcast({ msgs: claimMsg, gas: { gas: 500_000 } });
  console.log("Claimed", entry.amountInj, "INJ");
  console.log("Tx:", tx.txHash);
  console.log("Explorer:", `https://testnet.explorer.injective.network/transaction/${tx.txHash}`);
}

main().catch((error) => {
  console.error(error.originalMessage || error.message || error);
  process.exitCode = 1;
});