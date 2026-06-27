use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Binary, Uint128};

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
pub struct MigrateMsg {}

#[cw_serde]
pub enum ExecuteMsg {
    CreateCampaign {
        merkle_root: Binary,
        expires_at: u64,
        name: String,
    },
    Claim {
        campaign_id: u64,
        amount: Uint128,
        proof: Vec<Binary>,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(NextCampaignIdResponse)]
    NextCampaignId {},
    #[returns(CampaignResponse)]
    GetCampaign { campaign_id: u64 },
    #[returns(HasClaimedResponse)]
    HasClaimed { campaign_id: u64, address: String },
    #[returns(VerifyClaimResponse)]
    VerifyClaim {
        campaign_id: u64,
        address: String,
        amount: Uint128,
        proof: Vec<Binary>,
    },
}

#[cw_serde]
pub struct NextCampaignIdResponse {
    pub next_campaign_id: u64,
}

#[cw_serde]
pub struct CampaignResponse {
    pub merkle_root: Binary,
    pub deposited: Uint128,
    pub claimed: Uint128,
    pub expires_at: u64,
    pub name: String,
    pub paused: bool,
}

#[cw_serde]
pub struct HasClaimedResponse {
    pub claimed: bool,
}

#[cw_serde]
pub struct VerifyClaimResponse {
    pub valid: bool,
}