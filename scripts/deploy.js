const hre = require("hardhat");

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error(
      "Missing PRIVATE_KEY in .env\n\n1. Copy .env.example to .env\n2. Add the private key for your MetaMask testnet wallet\n3. Run: npm run deploy:testnet",
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account available. Check PRIVATE_KEY in .env");
  }
  console.log("Deploying with:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "INJ");

  const Factory = await hre.ethers.getContractFactory("InjectiveMerkleAirdrop");
  console.log("Sending deploy transaction...");
  const contract = await Factory.deploy(deployer.address);
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    console.log("Tx hash:", deployTx.hash);
    console.log("Waiting for confirmation (Injective testnet can take 1-3 min)...");
  }

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("\nInjectiveMerkleAirdrop deployed to:", address);
  console.log("\nAdd to .env and web/.env.local:");
  console.log(`NEXT_PUBLIC_AIRDROP_CONTRACT=${address}`);
  console.log(`AIRDROP_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});