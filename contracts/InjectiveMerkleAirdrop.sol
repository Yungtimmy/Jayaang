// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title InjectiveMerkleAirdrop
/// @notice Merkle-based token airdrop for Injective EVM testnet.
/// @dev Use address(0) as the token for native INJ campaigns.
contract InjectiveMerkleAirdrop is Ownable {
    using SafeERC20 for IERC20;

    struct Campaign {
        IERC20 token;
        bool isNative;
        bytes32 merkleRoot;
        uint256 deposited;
        uint256 claimed;
        uint256 expiresAt;
        string name;
        bool paused;
    }

    uint256 public nextCampaignId;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed token,
        bytes32 merkleRoot,
        uint256 deposited,
        uint256 expiresAt,
        string name
    );
    event Claimed(uint256 indexed campaignId, address indexed account, uint256 amount);
    event CampaignPaused(uint256 indexed campaignId, bool paused);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createCampaign(
        address token,
        bytes32 merkleRoot,
        uint256 depositAmount,
        uint256 expiresAt,
        string calldata name
    ) external payable returns (uint256 campaignId) {
        require(merkleRoot != bytes32(0), "root required");
        require(depositAmount > 0, "deposit required");
        require(expiresAt > block.timestamp, "expiry in past");

        bool isNative = token == address(0);
        if (isNative) {
            require(msg.value == depositAmount, "send exact INJ deposit");
        } else {
            require(msg.value == 0, "do not send INJ for ERC20 campaigns");
            IERC20(token).safeTransferFrom(msg.sender, address(this), depositAmount);
        }

        campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            token: IERC20(token),
            isNative: isNative,
            merkleRoot: merkleRoot,
            deposited: depositAmount,
            claimed: 0,
            expiresAt: expiresAt,
            name: name,
            paused: false
        });

        emit CampaignCreated(campaignId, msg.sender, token, merkleRoot, depositAmount, expiresAt, name);
    }

    function claim(uint256 campaignId, uint256 amount, bytes32[] calldata proof) external {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.deposited > 0, "unknown campaign");
        require(!campaign.paused, "paused");
        require(block.timestamp <= campaign.expiresAt, "expired");
        require(!hasClaimed[campaignId][msg.sender], "already claimed");
        require(campaign.claimed + amount <= campaign.deposited, "insufficient funds");

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        require(MerkleProof.verify(proof, campaign.merkleRoot, leaf), "invalid proof");

        hasClaimed[campaignId][msg.sender] = true;
        campaign.claimed += amount;

        if (campaign.isNative) {
            (bool ok,) = msg.sender.call{value: amount}("");
            require(ok, "INJ transfer failed");
        } else {
            campaign.token.safeTransfer(msg.sender, amount);
        }

        emit Claimed(campaignId, msg.sender, amount);
    }

    function setPaused(uint256 campaignId, bool paused) external onlyOwner {
        require(campaigns[campaignId].deposited > 0, "unknown campaign");
        campaigns[campaignId].paused = paused;
        emit CampaignPaused(campaignId, paused);
    }

    function getCampaign(uint256 campaignId)
        external
        view
        returns (
            address token,
            bool isNative,
            bytes32 merkleRoot,
            uint256 deposited,
            uint256 claimed,
            uint256 expiresAt,
            string memory name,
            bool paused
        )
    {
        Campaign storage campaign = campaigns[campaignId];
        return (
            address(campaign.token),
            campaign.isNative,
            campaign.merkleRoot,
            campaign.deposited,
            campaign.claimed,
            campaign.expiresAt,
            campaign.name,
            campaign.paused
        );
    }

    receive() external payable {}
}