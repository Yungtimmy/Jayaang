use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unknown campaign")]
    UnknownCampaign {},

    #[error("Campaign paused")]
    Paused {},

    #[error("Campaign expired")]
    Expired {},

    #[error("Already claimed")]
    AlreadyClaimed {},

    #[error("Insufficient funds")]
    InsufficientFunds {},

    #[error("Invalid proof")]
    InvalidProof {},

    #[error("Merkle root required")]
    RootRequired {},

    #[error("Deposit required")]
    DepositRequired {},

    #[error("Expiry in past")]
    ExpiryInPast {},

    #[error("Send exact INJ deposit")]
    ExactDepositRequired {},

    #[error("Only native INJ accepted")]
    OnlyNativeInj {},
}