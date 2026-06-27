#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    Uint128,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::merkle::{leaf_hash, verify};
use crate::msg::{
    CampaignResponse, ExecuteMsg, HasClaimedResponse, InstantiateMsg, NextCampaignIdResponse,
    QueryMsg,
};
use crate::state::{
    Campaign, CAMPAIGNS, CONTRACT_NAME, CONTRACT_VERSION, HAS_CLAIMED, NEXT_CAMPAIGN_ID,
};

const INJ_DENOM: &str = "inj";

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    NEXT_CAMPAIGN_ID.save(deps.storage, &0)?;
    Ok(Response::new().add_attribute("action", "instantiate"))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::CreateCampaign {
            merkle_root,
            expires_at,
            name,
        } => execute_create_campaign(deps, env, info, merkle_root, expires_at, name),
        ExecuteMsg::Claim {
            campaign_id,
            amount,
            proof,
        } => execute_claim(deps, env, info, campaign_id, amount, proof),
    }
}

fn execute_create_campaign(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    merkle_root: Binary,
    expires_at: u64,
    name: String,
) -> Result<Response, ContractError> {
    if merkle_root.len() != 32 {
        return Err(ContractError::RootRequired {});
    }
    if expires_at <= env.block.time.seconds() {
        return Err(ContractError::ExpiryInPast {});
    }

    let deposit = info
        .funds
        .iter()
        .find(|coin| coin.denom == INJ_DENOM)
        .map(|coin| coin.amount)
        .unwrap_or_else(Uint128::zero);

    if deposit.is_zero() {
        return Err(ContractError::DepositRequired {});
    }
    if info.funds.len() != 1 || info.funds[0].denom != INJ_DENOM {
        return Err(ContractError::OnlyNativeInj {});
    }

    let campaign_id = NEXT_CAMPAIGN_ID.load(deps.storage)?;
    let campaign = Campaign {
        merkle_root,
        deposited: deposit,
        claimed: Uint128::zero(),
        expires_at,
        name: name.clone(),
        paused: false,
    };

    CAMPAIGNS.save(deps.storage, campaign_id, &campaign)?;
    NEXT_CAMPAIGN_ID.save(deps.storage, &(campaign_id + 1))?;

    Ok(Response::new()
        .add_attribute("action", "create_campaign")
        .add_attribute("campaign_id", campaign_id.to_string())
        .add_attribute("creator", info.sender)
        .add_attribute("deposited", deposit)
        .add_attribute("name", name))
}

fn execute_claim(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    campaign_id: u64,
    amount: Uint128,
    proof: Vec<Binary>,
) -> Result<Response, ContractError> {
    let mut campaign = CAMPAIGNS
        .may_load(deps.storage, campaign_id)?
        .ok_or(ContractError::UnknownCampaign {})?;

    if campaign.paused {
        return Err(ContractError::Paused {});
    }
    if env.block.time.seconds() > campaign.expires_at {
        return Err(ContractError::Expired {});
    }

    let sender = info.sender.to_string();
    if HAS_CLAIMED
        .may_load(deps.storage, (campaign_id, sender.clone()))?
        .unwrap_or(false)
    {
        return Err(ContractError::AlreadyClaimed {});
    }

    if campaign.claimed + amount > campaign.deposited {
        return Err(ContractError::InsufficientFunds {});
    }

    let leaf = leaf_hash(&sender, amount);
    if !verify(&proof, campaign.merkle_root.as_slice(), leaf) {
        return Err(ContractError::InvalidProof {});
    }

    HAS_CLAIMED.save(deps.storage, (campaign_id, sender.clone()), &true)?;
    campaign.claimed += amount;
    CAMPAIGNS.save(deps.storage, campaign_id, &campaign)?;

    let send = BankMsg::Send {
        to_address: sender.clone(),
        amount: vec![Coin {
            denom: INJ_DENOM.to_string(),
            amount,
        }],
    };

    Ok(Response::new()
        .add_message(send)
        .add_attribute("action", "claim")
        .add_attribute("campaign_id", campaign_id.to_string())
        .add_attribute("claimer", sender)
        .add_attribute("amount", amount))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::NextCampaignId {} => to_json_binary(&query_next_campaign_id(deps)?),
        QueryMsg::GetCampaign { campaign_id } => {
            to_json_binary(&query_get_campaign(deps, campaign_id)?)
        }
        QueryMsg::HasClaimed {
            campaign_id,
            address,
        } => to_json_binary(&query_has_claimed(deps, campaign_id, address)?),
    }
}

fn query_next_campaign_id(deps: Deps) -> StdResult<NextCampaignIdResponse> {
    Ok(NextCampaignIdResponse {
        next_campaign_id: NEXT_CAMPAIGN_ID.load(deps.storage)?,
    })
}

fn query_get_campaign(deps: Deps, campaign_id: u64) -> StdResult<CampaignResponse> {
    let campaign = CAMPAIGNS
        .may_load(deps.storage, campaign_id)?
        .ok_or_else(|| cosmwasm_std::StdError::generic_err("unknown campaign"))?;

    Ok(CampaignResponse {
        merkle_root: campaign.merkle_root,
        deposited: campaign.deposited,
        claimed: campaign.claimed,
        expires_at: campaign.expires_at,
        name: campaign.name,
        paused: campaign.paused,
    })
}

fn query_has_claimed(deps: Deps, campaign_id: u64, address: String) -> StdResult<HasClaimedResponse> {
    let claimed = HAS_CLAIMED
        .may_load(deps.storage, (campaign_id, address))?
        .unwrap_or(false);
    Ok(HasClaimedResponse { claimed })
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(deps: DepsMut, _env: Env, _msg: Binary) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "migrate"))
}