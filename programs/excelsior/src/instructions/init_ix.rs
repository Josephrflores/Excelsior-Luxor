use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        seeds = [b"global_config"],
        bump,
        space = GlobalConfig::LEN
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    /// CHECK: We just store this address as the RWA Multisig
    pub rwa_wallet: UncheckedAccount<'info>,
    
    /// CHECK: Founder Wallet
    pub founder_wallet: UncheckedAccount<'info>,
    
    /// CHECK: XLS Mint
    pub xls_mint: UncheckedAccount<'info>,
    /// CHECK: LXR Mint
    pub lxr_mint: UncheckedAccount<'info>,
    
    /// CHECK: RWA Vault (LXR)
    pub rwa_vault_lxr: UncheckedAccount<'info>,
    /// CHECK: XLS Supply Vault
    pub xls_vault_supply: UncheckedAccount<'info>,
    /// CHECK: LXR Reward Vault
    pub lxr_vault_rewards: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitParams {
    pub fee_basis_points: u16,
}

pub fn handler(ctx: Context<Initialize>, params: InitParams) -> Result<()> {
    let config = &mut ctx.accounts.global_config;
    
    config.admin = ctx.accounts.admin.key();
    config.xls_mint = ctx.accounts.xls_mint.key();
    config.lxr_mint = ctx.accounts.lxr_mint.key();
    config.rwa_wallet = ctx.accounts.rwa_wallet.key(); // Multisig
    config.founder_wallet = ctx.accounts.founder_wallet.key();
    
    // Vaults
    config.rwa_vault_lxr = ctx.accounts.rwa_vault_lxr.key();
    config.xls_vault_supply = ctx.accounts.xls_vault_supply.key();
    config.lxr_vault_rewards = ctx.accounts.lxr_vault_rewards.key();
    
    config.fee_basis_points = params.fee_basis_points;
    config.max_fee_basis_points = 300; // Hard Cap 3%
    config.total_lxr_burned = 0;
    
    // Set Inflation Timer
    let clock = Clock::get()?;
    config.last_inflation_timestamp = clock.unix_timestamp;
    
    config.bump = ctx.bumps.global_config;
    
    msg!("Excelsior Global Config Initialized (V2)");
    Ok(())
}
