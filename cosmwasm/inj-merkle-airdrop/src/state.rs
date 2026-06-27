use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Binary, Uint128};
use cw_storage_plus::{Item, Map};

pub const CONTRACT_NAME: &str = "crates.io:inj-merkle-airdrop";
pub const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cw_serde]
pub struct Campaign {
    pub merkle_root: Binary,
    pub deposited: Uint128,
    pub claimed: Uint128,
    pub expires_at: u64,
    pub name: String,
    pub paused: bool,
}

pub const NEXT_CAMPAIGN_ID: Item<u64> = Item::new("next_campaign_id");
pub const CAMPAIGNS: Map<u64, Campaign> = Map::new("campaigns");
pub const HAS_CLAIMED: Map<(u64, String), bool> = Map::new("has_claimed");