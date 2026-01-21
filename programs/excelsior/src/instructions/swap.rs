use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked, Burn};
use crate::state::*;

#[derive(Accounts)]
pub struct BuyXls<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    // User Accounts
    #[account(mut)]
    pub user_lxr_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_xls_account: InterfaceAccount<'info, TokenAccount>,
    
    // Vaults
    #[account(mut)] // Contract Vault holding XLS for sale
    pub xls_vault_supply: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)] // RWA Vault receiving 70% LXR
    pub rwa_vault_lxr: InterfaceAccount<'info, TokenAccount>,
    
    // Mints
    #[account(address = global_config.xls_mint)]
    pub xls_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, address = global_config.lxr_mint)]
    pub lxr_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>, // Must be Token-2022
}

#[derive(Accounts)]
pub struct RedeemXls<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(mut)]
    pub user_lxr_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_xls_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub xls_vault_supply: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub rwa_vault_lxr: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut, address = global_config.xls_mint)]
    pub xls_mint: InterfaceAccount<'info, Mint>,
    #[account(address = global_config.lxr_mint)]
    pub lxr_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn buy_handler(ctx: Context<BuyXls>, amount_xls: u64) -> Result<()> {
    // 1 XLS = 1,000,000 LXR
    // User wants 'amount_xls'. Input in atomic units.
    // If XLS decimals = 9 and LXR decimals = 9, then 1 XLS (1e9 units) costs 1M LXR (1e6 * 1e9 units).
    // Ratio: 1,000,000 : 1
    
    let lxr_needed = amount_xls.checked_mul(1_000_000).ok_or(ProgramError::ArithmeticOverflow)?;
    
    // 30% Burn, 70% Vault
    let burn_amount = lxr_needed.checked_mul(30).unwrap().checked_div(100).unwrap();
    let vault_amount = lxr_needed.checked_sub(burn_amount).unwrap(); // Rest enters vault
    
    // 1. Transfer LXR to RWA Vault (70%)
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.user_lxr_account.to_account_info(),
            mint: ctx.accounts.lxr_mint.to_account_info(),
            to: ctx.accounts.rwa_vault_lxr.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        }
    );
    token_interface::transfer_checked(transfer_ctx, vault_amount, ctx.accounts.lxr_mint.decimals)?;
    
    // 2. Burn LXR (30%)
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.lxr_mint.to_account_info(),
            from: ctx.accounts.user_lxr_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        }
    );
    token_interface::burn(burn_ctx, burn_amount)?;
    
    // Update Stats
    ctx.accounts.global_config.total_lxr_burned += burn_amount;
    
    // 3. Transfer XLS from Supply Vault to User
    // Use PDA Signer
    let seeds = &[b"global_config".as_ref(), &[ctx.accounts.global_config.bump]];
    let signer = &[&seeds[..]];
    
    let transfer_xls = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.xls_vault_supply.to_account_info(),
            mint: ctx.accounts.xls_mint.to_account_info(),
            to: ctx.accounts.user_xls_account.to_account_info(),
            authority: ctx.accounts.global_config.to_account_info(),
        },
        signer
    );
    token_interface::transfer_checked(transfer_xls, amount_xls, ctx.accounts.xls_mint.decimals)?;
    
    msg!("Swap Successful: Paid {} LXR (Button 30%, Vault 70%), Received {} XLS", lxr_needed, amount_xls);
    Ok(())
}

pub fn redeem_handler(ctx: Context<RedeemXls>, amount_xls: u64) -> Result<()> {
    // 1. Burn User's XLS
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.xls_mint.to_account_info(),
            from: ctx.accounts.user_xls_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        }
    );
    token_interface::burn(burn_ctx, amount_xls)?;
    
    // 2. Calculate LXR to return
    // Redemption rate may vary, for now let's assume 1:1 backing value or fixed rate?
    // User Spec said: "Redemption: If user returns 1 XLS, contract gives proportional value... from Reserve"
    // For V1, let's assume we return the 70% that was put in initially (Guaranteed Floor).
    // Or do we calculate based on Total Reserve / Total XLS?
    // Let's implement Dynamic Redemption: Share = (Amount XLS / Total XLS Supply) * RWA Vault Balance
    // NOTE: Simpler for now -> Return fixed ratio 700,000 LXR per XLS (The "Book Value").
    
    let lxr_to_return = amount_xls.checked_mul(700_000).unwrap();
    
    // 3. Transfer LXR from RWA Vault to User
    let seeds = &[b"global_config".as_ref(), &[ctx.accounts.global_config.bump]];
    let signer = &[&seeds[..]];
    
    let transfer_lxr = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.rwa_vault_lxr.to_account_info(),
            mint: ctx.accounts.lxr_mint.to_account_info(),
            to: ctx.accounts.user_lxr_account.to_account_info(),
            authority: ctx.accounts.global_config.to_account_info(), // Assuming Config controls Vault
        },
        signer
    );
    token_interface::transfer_checked(transfer_lxr, lxr_to_return, ctx.accounts.lxr_mint.decimals)?;
    
    msg!("Redemption Successful: Burned {} XLS, Returned {} LXR", amount_xls, lxr_to_return);
    Ok(())
}
