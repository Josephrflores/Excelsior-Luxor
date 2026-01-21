# Manual Operations Guide

## 1. Harvest Transfer Fees (Manual)

Because the automated harvest feature is temporarily disabled in the smart contract, you must manually "harvest" the Transfer Fees from the Token-2022 Mint account to the RWA Vault.

### Prerequisites
- **Authority**: You need the `admin` wallet (the one configured in `Anchor.toml`).
- **Mint Address**: The LXR Token Mint address.
- **Destination**: The RWA Vault address (which holds the fees before splitting).

### How to Harvest with CLI

Run the following command in your terminal:

```bash
spl-token withdraw-withheld-tokens <LXR_MINT_ADDRESS> <RWA_VAULT_ADDRESS> --authority wallets/admin.json
```

**Where:**
- `<LXR_MINT_ADDRESS>`: The public key of your LXR token.
- `<RWA_VAULT_ADDRESS>`: The public key of the RWA Vault account. obtain this from your client/scripts or by inspecting the PDA.

### Workflow
1. **Accumulate Fees**: Users trade/transfer LXR, fees accumulate in the Mint's withheld account.
2. **Manual Harvest**: You run the command above. The tokens move from "Withheld" -> "RWA Vault".
3. **Distribute**: You call the `harvest_fees` instruction in the smart contract.
    - Since tokens are now in the RWA Vault, the contract will see them and split them:
        - 50% sent to Founder Wallet.
        - 50% kept in RWA Vault.

---

## 2. Pending Automated Features

- [ ] **Automated Harvest**: The code in `fees.rs` needs to be updated when Anchor supports `withdraw_withheld_tokens_from_mint` natively or when the manual CPI build issue is resolved.
