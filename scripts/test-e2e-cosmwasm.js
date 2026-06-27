require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Network } = require("@injectivelabs/networks");
const { MsgBroadcasterWithPk, MsgExecuteContract, PrivateKey } = require("@injectivelabs/sdk-ts");

function hexToBase64(hex) {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(normalized, "hex").toString("base64");
}

async function queryContract(contract, query) {
  const lcd = process.env.INJECTIVE_LCD ?? "https://testnet.sentry.lcd.injective.network";
  const encoded = Buffer.from(JSON.stringify(query)).toString("base64");
  const url = `${lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encoded}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Query failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  if (typeof payload.data === "string") {
    return JSON.parse(Buffer.from(payload.data, "base64").toString("utf8"));
  }
  return payload.data;
}

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env");
  }

  const contract =
    process.env.AIRDROP_CONTRACT_ADDRESS ?? process.env.NEXT_PUBLIC_AIRDROP_CONTRACT;
  if (!contract?.startsWith("inj1")) {
    throw new Error("Missing AIRDROP_CONTRACT_ADDRESS in .env");
  }

  const merklePath = path.resolve(process.argv[2] ?? "test-output/merkle.json");
  if (!fs.existsSync(merklePath)) {
    throw new Error(`Merkle file not found: ${merklePath}\nRun: npm run merkle -- test-recipients.csv ./test-output`);
  }

  const artifact = JSON.parse(fs.readFileSync(merklePath, "utf8"));
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

  const beforeCount = (await queryContract(contract, { next_campaign_id: {} })).next_campaign_id;
  console.log("Contract:", contract);
  console.log("Wallet:", injAddress);
  console.log("Campaigns before:", beforeCount);

  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  console.log("\n1) Creating campaign with", artifact.totalAmountInj, "INJ...");
  const createMsg = MsgExecuteContract.fromJSON({
    sender: injAddress,
    contractAddress: contract,
    msg: {
      create_campaign: {
        merkle_root: hexToBase64(artifact.root),
        expires_at: expiresAt,
        name: "E2E Test Drop",
      },
    },
    funds: [{ denom: "inj", amount: artifact.totalAmount }],
  });
  const createTx = await broadcaster.broadcast({
    msgs: createMsg,
    gas: { gas: 800_000 },
  });
  console.log("Create tx:", createTx.txHash);

  const afterCount = (await queryContract(contract, { next_campaign_id: {} })).next_campaign_id;
  const campaignId = afterCount - 1;
  console.log("Campaign ID:", campaignId);

  const campaign = await queryContract(contract, { get_campaign: { campaign_id: campaignId } });
  console.log("Campaign deposited:", campaign.deposited);
  console.log("Campaign claimed:", campaign.claimed);

  const proofEntry = artifact.proofs[injAddress.toLowerCase()];
  if (!proofEntry) {
    throw new Error(`Wallet ${injAddress} is not in merkle.json recipients`);
  }

  console.log("\n2) Claiming", proofEntry.amountInj, "INJ for", injAddress, "...");
  const claimMsg = MsgExecuteContract.fromJSON({
    sender: injAddress,
    contractAddress: contract,
    msg: {
      claim: {
        campaign_id: campaignId,
        amount: proofEntry.amount,
        proof: proofEntry.proof.map((step) => hexToBase64(step)),
      },
    },
  });
  const claimTx = await broadcaster.broadcast({
    msgs: claimMsg,
    gas: { gas: 500_000 },
  });
  console.log("Claim tx:", claimTx.txHash);

  const claimedFlag = await queryContract(contract, {
    has_claimed: { campaign_id: campaignId, address: injAddress },
  });
  const campaignAfter = await queryContract(contract, { get_campaign: { campaign_id: campaignId } });

  console.log("\nResult:");
  console.log("- has_claimed:", claimedFlag.claimed);
  console.log("- campaign claimed total:", campaignAfter.claimed);
  console.log("- explorer create:", `https://testnet.explorer.injective.network/transaction/${createTx.txHash}`);
  console.log("- explorer claim:", `https://testnet.explorer.injective.network/transaction/${claimTx.txHash}`);
  console.log("\nUse campaign ID", campaignId, "and test-output/merkle.json in the web UI Claim tab.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});