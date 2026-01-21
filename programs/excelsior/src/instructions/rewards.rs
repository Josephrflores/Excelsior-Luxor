use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use anchor_lang::solana_program::keccak;

#[derive(Accounts)]
pub struct InitDistributor<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        seeds = [b"distributor"],
        bump,
        space = 8 + 32 + 32 + 8 + 1 // discriminator, root, mint, total_claimed, bump
    )]
    pub distributor: Account<'info, Distributor>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u64)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"distributor"],
        bump = distributor.bump,
    )]
    pub distributor: Account<'info, Distributor>,
    
    #[account(
        init,
        payer = user,
        seeds = [b"claim_status", distributor.key().as_ref(), index.to_le_bytes().as_ref()],
        bump,
        space = 8 + 1 + 8 + 32, // IsClaimed, Amount, Claimant
    )]
    pub claim_status: Account<'info, ClaimStatus>,
    
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub distributor_vault: InterfaceAccount<'info, TokenAccount>,
    
    #[account(address = distributor.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
pub struct Distributor {
    pub root: [u8; 32],
    pub mint: Pubkey,
    pub total_claimed: u64,
    pub bump: u8,
}

#[account]
pub struct ClaimStatus {
    pub is_claimed: bool,
    pub amount: u64,
    pub claimant: Pubkey,
}

pub fn init_distributor_handler(ctx: Context<InitDistributor>, root: [u8; 32]) -> Result<()> {
    let distributor = &mut ctx.accounts.distributor;
    distributor.root = root;
    distributor.mint = ctx.accounts.mint.key();
    distributor.total_claimed = 0;
    distributor.bump = ctx.bumps.distributor;
    Ok(())
}

pub fn claim_handler(ctx: Context<ClaimReward>, index: u64, amount: u64, proof: Vec<[u8; 32]>) -> Result<()> {
    // Verify Merkle Proof
    // Leaf = Keccak(index, claimant_pubkey, amount)
    let leaf = keccak::hashv(&[
        &index.to_le_bytes(),
        &ctx.accounts.user.key().to_bytes(),
        &amount.to_le_bytes(),
    ]);
    
    require!(
        verify(proof, ctx.accounts.distributor.root, leaf.0),
        crate::ErrorCode::InvalidProof
    );

    // Mark claimed
    let claim_status = &mut ctx.accounts.claim_status;
    claim_status.is_claimed = true;
    claim_status.amount = amount;
    claim_status.claimant = ctx.accounts.user.key();
    
    // Update total claimed
    ctx.accounts.distributor.total_claimed += amount;
    
    // Transfer tokens
    let seeds = &[b"distributor".as_ref(), &[ctx.accounts.distributor.bump]];
    let signer = &[&seeds[..]];
    
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.distributor_vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.distributor.to_account_info(),
        },
        signer
    );
    token_interface::transfer_checked(transfer_ctx, amount, ctx.accounts.mint.decimals)?;
    
    msg!("Claimed {} tokens. Index: {}", amount, index);
    Ok(())
}

fn verify(proof: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed_hash = leaf;
    for proof_element in proof.into_iter() {
        if computed_hash <= proof_element {
            computed_hash = keccak::hashv(&[&computed_hash, &proof_element]).0;
        } else {
            computed_hash = keccak::hashv(&[&proof_element, &computed_hash]).0;
        }
    }
    computed_hash == root
}
