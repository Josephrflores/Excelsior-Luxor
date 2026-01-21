use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked, MintTo};
use crate::state::*;

#[derive(Accounts)]
pub struct DistributeRent<'info> {
    #[account(mut)]
    pub admin: Signer<'info>, // Payer of Rent

    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
        has_one = admin,
        has_one = lxr_mint,
        has_one = rwa_vault_lxr,
        has_one = lxr_vault_rewards,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub admin_lxr_account: InterfaceAccount<'info, TokenAccount>, // Source of Rent

    #[account(mut)]
    pub rwa_vault_lxr: InterfaceAccount<'info, TokenAccount>, // 60% Dest

    #[account(mut)]
    pub lxr_vault_rewards: InterfaceAccount<'info, TokenAccount>, // 40% Dest

    #[account(address = global_config.lxr_mint)]
    pub lxr_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct TriggerInflation<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
        has_one = admin,
        has_one = lxr_mint,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub lxr_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub reserve_wallet: InterfaceAccount<'info, TokenAccount>, // Where inflation goes (e.g. Admin/Holding)

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn distribute_rent_handler(ctx: Context<DistributeRent>, amount: u64) -> Result<()> {
    // Split: 60% RWA Vault, 40% Stakers (Reward Vault)
    let rwa_share = amount.checked_mul(60).unwrap().checked_div(100).unwrap();
    let staker_share = amount.checked_sub(rwa_share).unwrap();

    // 1. Transfer 60% to RWA Vault
    if rwa_share > 0 {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.admin_lxr_account.to_account_info(),
            mint: ctx.accounts.lxr_mint.to_account_info(),
            to: ctx.accounts.rwa_vault_lxr.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };
        token_interface::transfer_checked(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            rwa_share,
            ctx.accounts.lxr_mint.decimals,
        )?;
    }

    // 2. Transfer 40% to Reward Vault
    if staker_share > 0 {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.admin_lxr_account.to_account_info(),
            mint: ctx.accounts.lxr_mint.to_account_info(),
            to: ctx.accounts.lxr_vault_rewards.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };
        token_interface::transfer_checked(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            staker_share,
            ctx.accounts.lxr_mint.decimals,
        )?;

        // 3. Update Global Config Acc Rewards Per Share
        // acc_rewards += (reward_amount * 1e12) / total_staked_xls
        let total_staked = ctx.accounts.global_config.total_staked_xls;
        if total_staked > 0 {
            let additional_acc = (staker_share as u128)
                .checked_mul(1_000_000_000_000).unwrap()
                .checked_div(total_staked as u128).unwrap();
            
            ctx.accounts.global_config.acc_rewards_per_share = 
                ctx.accounts.global_config.acc_rewards_per_share.checked_add(additional_acc).unwrap();
        }
    }

    msg!("Rent Distributed: {} LXR (60% RWA, 40% Stakers)", amount);
    Ok(())
}

pub fn trigger_inflation_handler(ctx: Context<TriggerInflation>) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    let last_time = ctx.accounts.global_config.last_inflation_timestamp;

    // 5 Years = 5 * 365 * 24 * 60 * 60 ≈ 157,680,000 seconds
    const FIVE_YEARS: i64 = 157_680_000;

    // Bypass check if last_time is 0 (First run needs initialization? Or we set it at init?)
    // Assuming initialized at launch. If user wants to force trigger for testing, we might need a debug flag.
    // Standard rule:
    require!(current_time >= last_time + FIVE_YEARS, crate::ErrorCode::InflationNotReady); // We need to define ErrorCode

    // Mint 2.5% of Current Supply
    let current_supply = ctx.accounts.lxr_mint.supply;
    let mint_amount = current_supply.checked_mul(25).unwrap().checked_div(1000).unwrap(); // 2.5%

    // Execute Mint
    // Admin holds Mint Authority (Retained), so we use Admin as signer/authority
    let cpi_accounts = MintTo {
        mint: ctx.accounts.lxr_mint.to_account_info(),
        to: ctx.accounts.reserve_wallet.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    
    token_interface::mint_to(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        mint_amount,
    )?;

    // Update Timestamp
    ctx.accounts.global_config.last_inflation_timestamp = current_time;

    msg!("Inflation Triggered: Minted {} LXR to Reserve", mint_amount);
    Ok(())
}
#[derive(Accounts)]
pub struct UpgradeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
        has_one = admin,
        realloc = GlobalConfig::LEN,
        realloc::payer = admin,
        realloc::zero = false,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    // New Fields to Set
    /// CHECK: RWA Vault (LXR)
    pub rwa_vault_lxr: UncheckedAccount<'info>,
    /// CHECK: XLS Supply Vault
    pub xls_vault_supply: UncheckedAccount<'info>,
    /// CHECK: LXR Reward Vault
    pub lxr_vault_rewards: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn upgrade_config_handler(ctx: Context<UpgradeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Set new fields
    config.rwa_vault_lxr = ctx.accounts.rwa_vault_lxr.key();
    config.xls_vault_supply = ctx.accounts.xls_vault_supply.key();
    config.lxr_vault_rewards = ctx.accounts.lxr_vault_rewards.key();
    config.last_inflation_timestamp = clock.unix_timestamp;

    msg!("Global Config Upgraded to V3 (Size Increased)");
    Ok(())
}
