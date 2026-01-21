use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub staked_xls: u64,
    pub reward_debt: u128, // For MasterChef-style reward calculation
    pub bump: u8,
}

impl UserAccount {
    pub const LEN: usize = 8 + 32 + 8 + 16 + 1;
}
