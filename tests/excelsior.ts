const anchor = require("@coral-xyz/anchor");
const { Program } = anchor;
// import { Excelsior } from "../target/types/excelsior"; // Types usually for TS, skipping in JS/CJS or require if needed? Types are compile time.
const {
    createMint,
    createAccount,
    mintTo,
    getAccount,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    ExtensionType,
    createInitializeTransferFeeConfigInstruction,
    createInitializeMintInstruction,
    getMintLen,
    amountToUiAmount
} = require("@solana/spl-token");
const { Keypair, SystemProgram, Transaction, PublicKey, SendTransactionError } = require("@solana/web3.js");
const { assert } = require("chai");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

describe("excelsior", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Excelsior;
    console.log("DEBUG: Client Program ID:", program.programId.toString());
    const payer = provider.wallet;

    // Keypairs
    const admin = Keypair.generate();
    const xlsMintKp = Keypair.generate(); // Standard Token-2022
    const lxrMintKp = Keypair.generate(); // Transfer Fee Token-2022

    let xlsMint;
    let lxrMint;

    // Accounts
    let rwaWallet = Keypair.generate().publicKey;

    // PDAs
    let globalConfig;
    let xlsVaultSupply; // Holds XLS for buying
    let xlsVaultStaking;
    let rwaVaultLxr;

    // User Accounts
    const user = Keypair.generate();
    let userXls;
    let userLxr;
    let userAccount; // Staking State

    const DECIMALS = 9;
    const INITIAL_SUPPLY = 1_000_000 * 10 ** 9; // 1M tokens

    before(async () => {
        // Airdrop SOL to Admin and User
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(admin.publicKey, 10 * 10 ** 9),
            "confirmed"
        );
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(user.publicKey, 10 * 10 ** 9),
            "confirmed"
        );

        // --- Setup XLS Mint (Standard Token-2022) ---
        xlsMint = await createMint(
            provider.connection,
            admin,
            admin.publicKey,
            null,
            DECIMALS,
            xlsMintKp,
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        // --- Setup LXR Mint (Transfer Fee) ---
        // 3% Fee (300 basis points)
        const extensions = [ExtensionType.TransferFeeConfig];
        const mintLen = getMintLen(extensions);
        const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen);

        const createLxrTx = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: admin.publicKey,
                newAccountPubkey: lxrMintKp.publicKey,
                space: mintLen,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            }),
            createInitializeTransferFeeConfigInstruction(
                lxrMintKp.publicKey,
                admin.publicKey,
                admin.publicKey,
                300, // 3%
                BigInt(1_000_000 * 10 ** 9), // Cap
                TOKEN_2022_PROGRAM_ID
            ),
            createInitializeMintInstruction(
                lxrMintKp.publicKey,
                DECIMALS,
                admin.publicKey,
                null,
                TOKEN_2022_PROGRAM_ID
            )
        );
        await provider.sendAndConfirm(createLxrTx, [admin, lxrMintKp]);
        lxrMint = lxrMintKp.publicKey;

        // --- Setup PDAs ---
        [globalConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from("global_config")],
            program.programId
        );

    });

    it("Is initialized!", async () => {
        await program.methods
            .initialize({ feeBasisPoints: 300 })
            .accounts({
                admin: admin.publicKey,
                globalConfig: globalConfig,
                rwaWallet: rwaWallet,
                xlsMint: xlsMint,
                lxrMint: lxrMint,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        const config = await program.account.globalConfig.fetch(globalConfig);
        assert.ok(config.admin.equals(admin.publicKey));
        assert.equal(config.feeBasisPoints, 300);
    });

    it("Mints initial tokens to User", async () => {
        // Admin mints LXR to User for testing
        userLxr = await createAccount(
            provider.connection,
            payer.payer,
            lxrMint,
            user.publicKey,
            undefined,
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        await mintTo(
            provider.connection,
            admin,
            lxrMint,
            userLxr,
            admin,
            1_000_000 * 10 ** 9, // 1M LXR
            [],
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        // Setup Vaults
        xlsVaultSupply = getAssociatedTokenAddressSync(
            xlsMint,
            globalConfig,
            true,
            TOKEN_2022_PROGRAM_ID
        );

        // Fund Supply Vault
        const tx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                xlsVaultSupply,
                globalConfig,
                xlsMint,
                TOKEN_2022_PROGRAM_ID
            )
        );
        await provider.sendAndConfirm(tx, [payer.payer]);

        await mintTo(
            provider.connection,
            admin,
            xlsMint,
            xlsVaultSupply,
            admin,
            1_000_000 * 10 ** 9, // 1M XLS Supply
            [],
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        // Prep RWA Vault
        rwaVaultLxr = getAssociatedTokenAddressSync(
            lxrMint,
            globalConfig,
            true,
            TOKEN_2022_PROGRAM_ID
        );

        const tx2 = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                rwaVaultLxr,
                globalConfig,
                lxrMint,
                TOKEN_2022_PROGRAM_ID
            )
        );
        await provider.sendAndConfirm(tx2, [payer.payer]);
    });

    it("Buys XLS with LXR (Swap)", async () => {
        userXls = await createAccount(
            provider.connection,
            payer.payer,
            xlsMint,
            user.publicKey,
            undefined,
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        const amountXls = new anchor.BN(1 * 10 ** 9); // 1 XLS

        await program.methods
            .buyXls(amountXls)
            .accounts({
                user: user.publicKey,
                globalConfig: globalConfig,
                userLxrAccount: userLxr,
                userXlsAccount: userXls,
                xlsVaultSupply: xlsVaultSupply,
                rwaVaultLxr: rwaVaultLxr,
                xlsMint: xlsMint,
                lxrMint: lxrMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        // Check XLS received
        let userXlsBal = (await getAccount(provider.connection, userXls, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
        assert.equal(userXlsBal.toString(), amountXls.toString());
    });

    it("Stakes XLS", async () => {
        // Init User Account
        [userAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_account"), user.publicKey.toBuffer()],
            program.programId
        );

        await program.methods
            .initUser()
            .accounts({
                user: user.publicKey,
                userAccount: userAccount,
                systemProgram: SystemProgram.programId,
            })
            .signers([user])
            .rpc();

        // Staking Vault (Reusing Supply Vault logic)
        // See previous explanation.
        // Actually, contract uses ctx.accounts.xls_vault_staking
        // Unstake requires global_config authority.
        // The Supply Vault we created is an ATA of global_config.
        // So we can use it as Staking Vault too (Mixing funds not ideal but works for test).
        xlsVaultStaking = xlsVaultSupply;

        const stakeAmount = new anchor.BN(0.5 * 10 ** 9); // 0.5 XLS

        await program.methods
            .stakeXls(stakeAmount)
            .accounts({
                user: user.publicKey,
                globalConfig: globalConfig,
                userAccount: userAccount,
                userXlsAccount: userXls,
                xlsVaultStaking: xlsVaultStaking,
                xlsMint: xlsMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        const userState = await program.account.userAccount.fetch(userAccount);
        assert.equal(userState.stakedXls.toString(), stakeAmount.toString());
    });

    it("Redeems Merkle Rewards", async () => {
        const [distributor] = PublicKey.findProgramAddressSync(
            [Buffer.from("distributor")],
            program.programId
        );

        const rewardAmount = new anchor.BN(100 * 10 ** 9); // 100 XLS Reward

        const index = 0;
        const claimant = user.publicKey;

        // Helper to hash
        const leaf = keccak256(Buffer.concat([
            new anchor.BN(index).toArrayLike(Buffer, 'le', 8),
            claimant.toBuffer(),
            rewardAmount.toArrayLike(Buffer, 'le', 8)
        ]));

        const tree = new MerkleTree([leaf], keccak256, { sortPairs: true });
        const root = tree.getRoot();
        const proof = tree.getProof(leaf).map(p => p.data);

        await program.methods
            .initDistributor(Array.from(root))
            .accounts({
                admin: admin.publicKey,
                distributor: distributor,
                mint: xlsMint,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        const distributorVault = getAssociatedTokenAddressSync(
            xlsMint,
            distributor,
            true,
            TOKEN_2022_PROGRAM_ID
        );

        const tx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                distributorVault,
                distributor,
                xlsMint,
                TOKEN_2022_PROGRAM_ID
            )
        );
        await provider.sendAndConfirm(tx, [payer.payer]);

        await mintTo(
            provider.connection,
            admin,
            xlsMint,
            distributorVault,
            admin,
            1000 * 10 ** 9,
            [],
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        const [claimStatus] = PublicKey.findProgramAddressSync(
            [Buffer.from("claim_status"), distributor.toBuffer(), new anchor.BN(index).toArrayLike(Buffer, 'le', 8)],
            program.programId
        );

        await program.methods
            .claimReward(new anchor.BN(index), rewardAmount, proof)
            .accounts({
                user: user.publicKey,
                distributor: distributor,
                claimStatus: claimStatus,
                userTokenAccount: userXls,
                distributorVault: distributorVault,
                mint: xlsMint,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        let userXlsBal = (await getAccount(provider.connection, userXls, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
        console.log("User XLS after claim:", userXlsBal.toString());
        const expected = new anchor.BN(100.5 * 10 ** 9);
        assert.equal(userXlsBal.toString(), expected.toString());
    });

    it("Triggers Inflation (Expect Fail < 5 Years)", async () => {
        try {
            await program.methods.triggerInflation()
                .accounts({
                    admin: admin.publicKey,
                    globalConfig: globalConfig,
                    lxrMint: lxrMint,
                    reserveWallet: rwaVaultLxr, // Use RWA Vault as reserve for test
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .signers([admin])
                .rpc();
            assert.fail("Should have failed with InflationNotReady");
        } catch (e) {
            assert.ok(e.message.includes("InflationNotReady") || e.message.includes("custom program error"));
        }
    });

    it("Distributes Rent (60/40 Split)", async () => {
        const rentAmount = new anchor.BN(1000 * 10 ** 9); // 1000 LXR Rent

        // 1. Fund Admin (Source of Rent)
        // Admin already has LXR from setup? No, Admin minted to User.
        // Let's mint to Admin ATA
        const adminLxr = await createAccount(
            provider.connection,
            payer.payer,
            lxrMint,
            admin.publicKey,
            undefined,
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );
        await mintTo(
            provider.connection,
            admin,
            lxrMint,
            adminLxr,
            admin,
            1000 * 10 ** 9,
            [],
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        // 2. Setup Reward Vault (40% Dest) - We can use xlsVaultSupply for now as dummy
        // Actually, let's create a new one to be clean "lxrVaultRewards"
        // But `globalConfig` has `lxr_vault_rewards` field?
        // Wait, did we initialize it?
        // `initialize` instruction takes `InitParams` which probably sets these PDAs or fields.
        // `lib.rs`: initialize calls `init_ix::handler`.
        // Let's check `init_ix` to see what fields are set.
        // If they are set to expected PDAs, we must use those.
        // In `tests/excelsior.ts`, `before` set `rwaVaultLxr` and `xlsVaultSupply`.
        // Did it set `lxrVaultRewards`? No.

        // Assumption: The `initialize` call in test might need update or we assumes defaults?
        // Let's assume for this test we can just call `distributeRent`.
        // BUT `DistributeRent` context requires `lxr_vault_rewards`.
        // And `global_config` has `has_one = lxr_vault_rewards`.
        // So we need to ensure `global_config` has the correct key.
        // If `initialize` set it, we need to know what it is.
        // Checking `admin_ops` DistributeRent struct:
        // has_one = lxr_vault_rewards.

        // Since we can't easily re-init, maybe we should call `upgradeConfig` to set it?
        // Yes! `upgrade_config` exists.

        const lxrVaultRewardsKp = Keypair.generate(); // Standalone or ATA? 
        // Likely an ATA of GlobalConfig? Or Admin? 
        // Use an ATA of GlobalConfig (Reward Vault).
        const lxrVaultRewards = await createAccount(
            provider.connection,
            payer.payer,
            lxrMint,
            globalConfig, // Owner
            undefined,
            { commitment: 'confirmed' },
            TOKEN_2022_PROGRAM_ID
        );

        // Upgrade Config
        await program.methods.upgradeConfig()
            .accounts({
                admin: admin.publicKey,
                globalConfig: globalConfig,
                rwaVaultLxr: rwaVaultLxr,     // Keep same
                xlsVaultSupply: xlsVaultSupply, // Keep same
                lxrVaultRewards: lxrVaultRewards, // NEW
                systemProgram: SystemProgram.programId
            })
            .signers([admin])
            .rpc();

        // 3. Distribute
        await program.methods.distributeRent(rentAmount)
            .accounts({
                admin: admin.publicKey,
                globalConfig: globalConfig,
                adminLxrAccount: adminLxr,
                rwaVaultLxr: rwaVaultLxr,
                lxrVaultRewards: lxrVaultRewards,
                lxrMint: lxrMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID
            })
            .signers([admin])
            .rpc();

        // 4. Verify
        // RWA (60%) = 600
        // Rewards (40%) = 400
        // Previous RWA Balance?
        // In "Mints initial tokens", we didn't fund RWA vault. It should be 0.

        const rwaBal = (await getAccount(provider.connection, rwaVaultLxr, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
        const rewardsBal = (await getAccount(provider.connection, lxrVaultRewards, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;

        assert.equal(rwaBal.toString(), (600 * 10 ** 9).toString());
        assert.equal(rewardsBal.toString(), (400 * 10 ** 9).toString());
    });
});
