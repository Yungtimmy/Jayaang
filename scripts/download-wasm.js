const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "cosmwasm", "artifacts");
const outFile = path.join(outDir, "inj_merkle_airdrop.wasm");
const repo = process.env.GITHUB_REPOSITORY ?? "Yungtimmy/Jayaang";

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function tryGh(command) {
  try {
    return run(command);
  } catch {
    return null;
  }
}

function main() {
  if (!tryGh("gh --version")) {
    throw new Error(
      "GitHub CLI (gh) is required to download WASM.\n" +
        "Codespace: gh is usually preinstalled — run `gh auth login`.\n" +
        "Or build locally: npm run build:cosmwasm:docker (needs Docker).",
    );
  }

  fs.mkdirSync(outDir, { recursive: true });
  if (fs.existsSync(outFile)) {
    fs.unlinkSync(outFile);
  }

  const runId = tryGh(
    `gh run list --repo ${repo} --workflow build-wasm.yml --limit 20 --json databaseId,conclusion --jq "[.[] | select(.conclusion==\\"success\\")][0].databaseId"`,
  );

  if (!runId) {
    throw new Error(
      `No successful "Build CosmWasm WASM" run found for ${repo}.\n` +
        "Push contract changes to GitHub or run the workflow manually, then retry.",
    );
  }

  console.log(`Downloading WASM from GitHub Actions run ${runId}...`);
  execSync(
    `gh run download ${runId} --repo ${repo} --name inj_merkle_airdrop-wasm --dir "${outDir}"`,
    { stdio: "inherit" },
  );

  if (!fs.existsSync(outFile)) {
    throw new Error(`Download finished but ${outFile} is missing.`);
  }

  const size = fs.statSync(outFile).size;
  console.log(`Saved ${outFile} (${size} bytes)`);
}

main();