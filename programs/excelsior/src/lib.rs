use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::init_ix::*;
use instructions::swap::*;
use instructions::stake::*;
use instructions::fees::*;
use instructions::rewards::*;
use instructions::admin_ops::*;

declare_id!("CihitmkdTdh48gvUZSjU7rZ8EARQksJNxspwnRu7ZhAp"); // Force Rebuild 

#[program]
pub mod excelsior {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitParams) -> Result<()> {
        instructions::init_ix::handler(ctx, params)
    }

    pub fn buy_xls(ctx: Context<BuyXls>, amount_xls: u64) -> Result<()> {
        instructions::swap::buy_handler(ctx, amount_xls)
    }

    pub fn redeem_xls(ctx: Context<RedeemXls>, amount_xls: u64) -> Result<()> {
        instructions::swap::redeem_handler(ctx, amount_xls)
    }

    pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
        instructions::stake::init_user_handler(ctx)
    }

    pub fn stake_xls(ctx: Context<StakeXls>, amount: u64) -> Result<()> {
        instructions::stake::stake_handler(ctx, amount)
    }

    pub fn unstake_xls(ctx: Context<UnstakeXls>, amount: u64) -> Result<()> {
        instructions::stake::unstake_handler(ctx, amount)
    }

    pub fn harvest_fees(ctx: Context<HarvestFees>) -> Result<()> {
        instructions::fees::harvest_handler(ctx)
    }

    pub fn init_distributor(ctx: Context<InitDistributor>, root: [u8; 32]) -> Result<()> {
        instructions::rewards::init_distributor_handler(ctx, root)
    }

    pub fn claim_reward(ctx: Context<ClaimReward>, index: u64, amount: u64, proof: Vec<[u8; 32]>) -> Result<()> {
        instructions::rewards::claim_handler(ctx, index, amount, proof)
    }

    pub fn distribute_rent(ctx: Context<DistributeRent>, amount: u64) -> Result<()> {
        instructions::admin_ops::distribute_rent_handler(ctx, amount)
    }

    pub fn trigger_inflation(ctx: Context<TriggerInflation>) -> Result<()> {
        instructions::admin_ops::trigger_inflation_handler(ctx)
    }

    pub fn upgrade_config(ctx: Context<UpgradeConfig>) -> Result<()> {
        instructions::admin_ops::upgrade_config_handler(ctx)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds.")]
    InsufficientFunds,
    #[msg("Invalid Merkle proof.")]
    InvalidProof,
    #[msg("Inflation trigger not yet ready.")]
    InflationNotReady,
}
