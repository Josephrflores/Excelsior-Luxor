use anchor_lang::prelude::*;

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub xls_mint: Pubkey,
    pub lxr_mint: Pubkey,
    pub rwa_vault_lxr: Pubkey, // Token Account for RWA Vault (LXR)
    pub xls_vault_supply: Pubkey, // Token Account holding the Fixed Supply of XLS to be sold
    pub rwa_wallet: Pubkey, // The actual wallet key that controls the assets (Multisig)
    pub founder_wallet: Pubkey, // Founder Wallet (50% Fees)
    
    // Fee Config
    pub fee_basis_points: u16, // Current Fee
    pub max_fee_basis_points: u16, // Hard Cap (300)
    
    // Stats
    pub total_lxr_burned: u64,
    pub total_staked_xls: u64,
    pub acc_rewards_per_share: u128, // Precision 1e12
    pub last_inflation_timestamp: i64,
    pub lxr_vault_rewards: Pubkey, // Vault holding LXR for staking rewards
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 8 + 32*8 + 2*2 + 8*2 + 8 + 16 + 1; // Updated for new fields
}
