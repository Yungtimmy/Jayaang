require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
  },
  networks: {
    injectiveTestnet: {
      url: process.env.INJECTIVE_TESTNET_RPC ?? "https://k8s.testnet.json-rpc.injective.network/",
      chainId: 1439,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY.trim().startsWith("0x")
            ? process.env.PRIVATE_KEY.trim()
            : `0x${process.env.PRIVATE_KEY.trim()}`]
        : [],
    },
  },
};