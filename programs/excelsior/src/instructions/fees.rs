use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;

#[derive(Accounts)]
pub struct HarvestFees<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
        has_one = admin,
        has_one = lxr_mint,
        has_one = rwa_vault_lxr,
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(mut)]
    pub lxr_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub rwa_vault_lxr: InterfaceAccount<'info, TokenAccount>,
    
    // Founder Wallet to receive 50%
    #[account(mut, address = global_config.founder_wallet)]
    pub founder_wallet: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn harvest_handler(ctx: Context<HarvestFees>) -> Result<()> {
    // 1. Snapshot RWA Vault Balance (to calculate how much was harvested)
    let pre_balance = ctx.accounts.rwa_vault_lxr.amount;
    
    // 2. Withdraw Withheld Tokens from Mint -> RWA Vault
    // We withdraw EVERYTHING to RWA Vault first, then split.
    // Auth for withdrawing from Mint is Admin (Config Auth/Withdraw Auth).
    
    // TODO: Automated harvest is temporarily disabled due to anchor-spl 0.29.0 limitations.
    // MANUAL STEP: The Admin must manually harvest withheld tokens to the RWA Vault using the CLI/Script.
    /* 
    let ix = anchor_spl::token_2022::spl_token_2022::instruction::withdraw_withheld_tokens_from_mint(
        ctx.accounts.token_program.key,
        &ctx.accounts.lxr_mint.key(),
        &ctx.accounts.rwa_vault_lxr.key(),
        &ctx.accounts.admin.key(),
        &[], // Signers
    )?;
    
    solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.lxr_mint.to_account_info(),
            ctx.accounts.rwa_vault_lxr.to_account_info(),
            ctx.accounts.admin.to_account_info(),
            ctx.accounts.token_program.to_account_info(), // Program account
        ],
    )?;
    */
    
    // 3. Calculate Harvested Amount
    ctx.accounts.rwa_vault_lxr.reload()?;
    let post_balance = ctx.accounts.rwa_vault_lxr.amount;
    
    let harvested_amount = post_balance.saturating_sub(pre_balance);
    
    if harvested_amount == 0 {
        msg!("No fees to harvest.");
        return Ok(());
    }
    
    // 4. Split Fees (50% to Owner/Administrator)
    let founder_share = harvested_amount / 2;
    // Remainder stays in RWA Fee Vault (approx 50%) for Property Acquisition
    
    if founder_share > 0 {
        let seeds = &[b"global_config".as_ref(), &[ctx.accounts.global_config.bump]];
        let signer = &[&seeds[..]];
        
        // Transfer from RWA Vault (PDA Auth) -> Founder
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.rwa_vault_lxr.to_account_info(),
                mint: ctx.accounts.lxr_mint.to_account_info(),
                to: ctx.accounts.founder_wallet.to_account_info(),
                authority: ctx.accounts.global_config.to_account_info(),
            },
            signer
        );
        
        token_interface::transfer_checked(transfer_ctx, founder_share, ctx.accounts.lxr_mint.decimals)?;
    }
    
    msg!("Harvested {} LXR. Sent {} to Founder (50%).", harvested_amount, founder_share); // Force

    
    Ok(())
}
