# Project Wallets and Keys

*Location: All keys are designated in the `wallets/` directory of the project root.*

## 1. System & Authority
*   **`admin.json`**: **The Super User.** Deploys the contract, controls the Mints (XLS/LXR), Upgrades Config, Triggers Inflation, Distributes Rent.
*   **`lxr_mint.json`**: The Keypair for the Luxor (LXR) Token Mint address.
*   **`xls_mint.json`**: The Keypair for the Excelsior (XLS) Token Mint address.

## 2. Infrastructure & Vaults
*   **`rwa_vault.json`**: **RWA Fee Vault.** Collects the 50% split of fees + 60% split of rent.
*   **`rewards_pool.json`**: **Reward Vault.** Holds funds to be distributed to Stakers.
*   **`operations.json` / `master_operations.json`**: Operational wallets for daily expenses.
*   **`holding.json` / `master_holding.json`**: Long-term holding wallets.
*   **`founder.json`**: **Founder Wallet.** Receives 50% of the Transaction Fees.
*   **`founder_vault.json`**: Secondary founder storage (if used).
*   **`central_vault.json`**: Central storage (if used).
*   **`rwa_multisig.json`**: Placeholder for future Multisig implementation.

## 3. User & Distribution Wallets
*   **Named Recipients:**
    *   `distribution/Roosevelt.json`
    *   `distribution/Valentina.json`
    *   `distribution/Udreamms.json`
    *   `distribution/Julio.json` (New)
*   **Unnamed Recipients:**
    *   `distribution/Unnamed_2.json` through `distribution/Unnamed_47.json`

## 4. Master Allocations (Billeteras Maestras)
*   **`wallets/master_personal.json`**: Personal (10%)
*   **`wallets/master_operations.json`**: Operations (10%)
*   **`wallets/master_holding.json`**: Holding (15%*)
*   **`wallets/master_reserve.json`**: Market Reserve (65% + Remainder)
