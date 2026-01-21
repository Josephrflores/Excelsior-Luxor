# Excelsior Project Documentation

**Project Name:** Excelsior
**Version:** V2 (Draft)
**Type:** Real World Asset (RWA) Tokenization Protocol on Solana

## 1. Core Features (V2)

### A. Tokenomics & Fees
*   **Transaction Fees:** 1% on transfers/swaps (configurable).
*   **Fee Split:**
    *   **50%** to the **Founder Wallet** (Administrator/Owner).
    *   **50%** to the **RWA Fee Vault** (kept for property acquisition/maintenance).
*   **Harvesting:** Currently configured for **Manual Harvest** (see Manual Operations).

### B. Distribution Structure
*   **LXR Supply:** 2,025,000,000 (2.025 Billion)
*   **XLS Supply:** 20,250,000 (20.25 Million)
*   **Master Allocations:**
    *   **Personal:** 10%
    *   **Operations:** 10%
    *   **Holding:** 15% (Less distribution allocations)
    *   **Market Reserve:** 65%

### C. Inflation & Rent
*   **Inflation:** 2.5% every 5 years (to Reserve/Rewards).
*   **Rent:** 60% RWA Vault, 40% Stakers.

## 2. Technical Specifications

### Addresses & Seeds
*   **Program ID:** `CihitmkdTdh48gvUZSjU7rZ8EARQksJNxspwnRu7ZhAp`
*   **LXR Mint:** `7Qm6qUCXGZfGBYYFzq2kTbwTDah5r3d9DcPJHRT8Wdth`
*   **XLS Mint:** `GM4vKHRrqg84mKRixpVr5FuLUNL45b5dFLqcYQQpwoki`
*   **Admin:** `7EdDpmBEvhw1v79ysqQrEK7iHDVzBaRPuwnUDP2vu3Lk`

## 3. Manual Operations Guide

### Harvesting Fees
Due to current library limitations, the "Harvest Fees" process is manual:
1.  **Step 1:** Use Solana CLI/Script to withdraw "Withheld Tokens" from the Mint to the RWA Vault.
    ```bash
    spl-token withdraw-withheld-tokens <LXR_MINT> <RWA_VAULT> --authority admin.json
    ```
2.  **Step 2:** Call the contract's `harvest_fees` instruction (optional, currently it just splits what is *already* in the vault if you trigger it, but step 1 basically does the job of moving funds).

### Deploying
The compiled binary is located at:
`programs/excelsior/target/deploy/excelsior.so`

## 4. Pending Items
*   **IDL Generation:** Automatic IDL generation is currently blocked by environment issues. Tests can be run manually or via integration scripts once the environment matches.
*   **Frontend Integration:** Requires the IDL (Interface Definition Language) file to interact easily with the contract.

## 5. Wallets
See `wallets.md` for a comprehensive list of project wallets and keys.
