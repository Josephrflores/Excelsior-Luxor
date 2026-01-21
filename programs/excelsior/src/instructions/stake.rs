use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        seeds = [b"user_account", user.key().as_ref()],
        bump,
        space = UserAccount::LEN
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeXls<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    // User Accounts
    #[account(mut)]
    pub user_xls_account: InterfaceAccount<'info, TokenAccount>, // Deposit Source
    #[account(mut)]
    pub user_lxr_account: InterfaceAccount<'info, TokenAccount>, // Reward Dest
    
    // Vaults
    #[account(mut)]
    pub xls_vault_staking: InterfaceAccount<'info, TokenAccount>, // Deposit Dest
    #[account(mut, address = global_config.lxr_vault_rewards)]
    pub lxr_vault_rewards: InterfaceAccount<'info, TokenAccount>, // Reward Source (LXR)
    
    #[account(address = global_config.xls_mint)]
    pub xls_mint: InterfaceAccount<'info, Mint>,
    #[account(address = global_config.lxr_mint)]
    pub lxr_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct UnstakeXls<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub user_xls_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_lxr_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub xls_vault_staking: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = global_config.lxr_vault_rewards)]
    pub lxr_vault_rewards: InterfaceAccount<'info, TokenAccount>,
    
    #[account(address = global_config.xls_mint)]
    pub xls_mint: InterfaceAccount<'info, Mint>,
    #[account(address = global_config.lxr_mint)]
    pub lxr_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn init_user_handler(ctx: Context<InitUser>) -> Result<()> {
    let user_acct = &mut ctx.accounts.user_account;
    user_acct.owner = ctx.accounts.user.key();
    user_acct.staked_xls = 0;
    user_acct.reward_debt = 0;
    user_acct.bump = ctx.bumps.user_account;
    Ok(())
}

pub fn stake_handler(ctx: Context<StakeXls>, amount: u64) -> Result<()> {
    let global_config = &mut ctx.accounts.global_config;
    let user_acct = &mut ctx.accounts.user_account;
    
    // 1. Update Rewards (Claim Pending LXR)
    let acc_rewards = global_config.acc_rewards_per_share;
    if user_acct.staked_xls > 0 {
        let pending = (user_acct.staked_xls as u128)
            .checked_mul(acc_rewards).unwrap()
            .checked_div(1_000_000_000_000).unwrap()
            .checked_sub(user_acct.reward_debt).unwrap();
            
        if pending > 0 {
            // Transfer LXR from Reward Vault -> User
            let seeds = &[b"global_config".as_ref(), &[global_config.bump]];
            let signer = &[&seeds[..]];
            
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.lxr_vault_rewards.to_account_info(),
                    mint: ctx.accounts.lxr_mint.to_account_info(),
                    to: ctx.accounts.user_lxr_account.to_account_info(),
                    authority: global_config.to_account_info(),
                },
                signer
            );
            token_interface::transfer_checked(transfer_ctx, pending as u64, ctx.accounts.lxr_mint.decimals)?;
            msg!("Claimed {} LXR pending rewards", pending);
        }
    }
    
    // 2. Transfer Staked XLS from User to Vault
    if amount > 0 {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.user_xls_account.to_account_info(),
                mint: ctx.accounts.xls_mint.to_account_info(),
                to: ctx.accounts.xls_vault_staking.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }
        );
        token_interface::transfer_checked(transfer_ctx, amount, ctx.accounts.xls_mint.decimals)?;
        
        user_acct.staked_xls = user_acct.staked_xls.checked_add(amount).unwrap();
        global_config.total_staked_xls = global_config.total_staked_xls.checked_add(amount).unwrap();
    }
    
    // 3. Update Reward Debt
    user_acct.reward_debt = (user_acct.staked_xls as u128)
        .checked_mul(acc_rewards).unwrap()
        .checked_div(1_000_000_000_000).unwrap();
        
    Ok(())
}

pub fn unstake_handler(ctx: Context<UnstakeXls>, amount: u64) -> Result<()> {
    let global_config = &mut ctx.accounts.global_config;
    let user_acct = &mut ctx.accounts.user_account;
    
    require!(user_acct.staked_xls >= amount, crate::ErrorCode::InsufficientFunds);
    
    // 1. Update Rewards (Claim Pending LXR)
    let acc_rewards = global_config.acc_rewards_per_share;
    let pending = (user_acct.staked_xls as u128)
        .checked_mul(acc_rewards).unwrap()
        .checked_div(1_000_000_000_000).unwrap()
        .checked_sub(user_acct.reward_debt).unwrap();
        
    let seeds = &[b"global_config".as_ref(), &[global_config.bump]];
    let signer = &[&seeds[..]];

    if pending > 0 {
         let transfer_ctx = CpiContext::new_with_signer(
             ctx.accounts.token_program.to_account_info(),
             TransferChecked {
                 from: ctx.accounts.lxr_vault_rewards.to_account_info(),
                 mint: ctx.accounts.lxr_mint.to_account_info(),
                 to: ctx.accounts.user_lxr_account.to_account_info(),
                 authority: global_config.to_account_info(),
             },
             signer
         );
         token_interface::transfer_checked(transfer_ctx, pending as u64, ctx.accounts.lxr_mint.decimals)?;
         msg!("Claimed {} LXR rewards", pending);
    }
    
    // 2. Transfer Staked XLS back to User
    if amount > 0 {
         let transfer_ctx = CpiContext::new_with_signer(
             ctx.accounts.token_program.to_account_info(),
             TransferChecked {
                 from: ctx.accounts.xls_vault_staking.to_account_info(),
                 mint: ctx.accounts.xls_mint.to_account_info(),
                 to: ctx.accounts.user_xls_account.to_account_info(),
                 authority: global_config.to_account_info(),
             },
             signer
         );
         token_interface::transfer_checked(transfer_ctx, amount, ctx.accounts.xls_mint.decimals)?;
         
         user_acct.staked_xls = user_acct.staked_xls.checked_sub(amount).unwrap();
         global_config.total_staked_xls = global_config.total_staked_xls.checked_sub(amount).unwrap();
    }
    
    // 3. Update Reward Debt
    user_acct.reward_debt = (user_acct.staked_xls as u128)
        .checked_mul(acc_rewards).unwrap()
        .checked_div(1_000_000_000_000).unwrap();
        
    Ok(())
}
