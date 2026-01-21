
import * as anchor from "@coral-xyz/anchor";
import {
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    SystemProgram,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction
} from "@solana/web3.js";
import fs from 'fs';
import { Program } from "@coral-xyz/anchor";

// Load IDL (assuming it's built or we define interface)
// For pure script without local IDL, we might need to rely on what's in target/idl/excelsior.json
// We'll try to load it dynamically.

const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

async function main() {
    // 1. Setup Provider (Robust)
    let provider: anchor.AnchorProvider;
    if (process.env.ANCHOR_PROVIDER_URL) {
        provider = anchor.AnchorProvider.env();
    } else {
        console.log("Env vars missing, using fallback (Devnet)...");
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");
        if (!fs.existsSync("./wallets/admin.json")) throw new Error("Admin wallet not found!");
        const secret = JSON.parse(fs.readFileSync("./wallets/admin.json", 'utf8'));
        const wallet = new anchor.Wallet(Keypair.fromSecretKey(new Uint8Array(secret)));
        provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    }
    anchor.setProvider(provider);
    const connection = provider.connection;
    const admin = (provider.wallet as anchor.Wallet).payer;

    console.log("Admin:", admin.publicKey.toBase58());

    // 2. Load Wallets
    ensureDir("./wallets");
    const getOrGenKeypair = (name: string): Keypair => {
        const path = `./wallets/${name}.json`;
        if (fs.existsSync(path)) {
            const secret = JSON.parse(fs.readFileSync(path, 'utf8'));
            return Keypair.fromSecretKey(new Uint8Array(secret));
        } else {
            const kp = Keypair.generate();
            fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
            console.log(`Generated new keypair for ${name}: ${kp.publicKey.toBase58()}`);
            return kp;
        }
    };

    const founder = getOrGenKeypair("founder");
    const operations = getOrGenKeypair("operations");
    const rwaWallet = getOrGenKeypair("rwa_multisig"); // Mock for now

    // Load Mint Keypairs (Should exist from create_tokens)
    if (!fs.existsSync("./wallets/xls_mint.json") || !fs.existsSync("./wallets/lxr_mint.json")) {
        console.error("Mints not found. Run create_tokens.ts first.");
        return;
    }
    const xlsMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/xls_mint.json", 'utf8'))));
    const lxrMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/lxr_mint.json", 'utf8'))));

    const xlsMint = xlsMintKp.publicKey;
    const lxrMint = lxrMintKp.publicKey;

    // 3. Initialize Program Global Config
    // We need the IDL.
    const idl = JSON.parse(fs.readFileSync("./target/idl/excelsior.json", "utf8"));
    const programId = new PublicKey("ACvdkCFF3piATdcAXQemmdu5FWXVHfv7kv4Y5vT3jawS");
    const program = new Program(idl, programId, provider);

    const [globalConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_config")],
        programId
    );

    try {
        const configAccount = await program.account.globalConfig.fetchNullable(globalConfig);
        if (!configAccount) {
            console.log("Initializing Global Config...");
            await program.methods
                .initialize({ feeBasisPoints: 300 })
                .accounts({
                    admin: admin.publicKey,
                    globalConfig: globalConfig,
                    rwaWallet: rwaWallet.publicKey,
                    founderWallet: founder.publicKey, // NEW
                    xlsMint: xlsMint,
                    lxrMint: lxrMint,
                    systemProgram: SystemProgram.programId,
                })
                .signers([admin])
                .rpc();
            console.log("Global Config Initialized:", globalConfig.toBase58());
        } else {
            console.log("Global Config already initialized.");
        }
    } catch (e) {
        console.error("Error initializing config:", e);
    }

    // 4. Initial Token Distribution
    // LXR: Mint 2.025 Billion
    // XLS: Mint 20.25 Million

    // Create Config-Owned Vaults if they don't exist?
    // Wait, the program expects to create them? NO, program uses them in Swap.
    // They are ATAs of GlobalConfig (PDA).

    const xlsVaultSupply = await getOrCreateAssociatedTokenAccount(
        connection,
        admin, // Payer
        xlsMint,
        globalConfig, // Owner
        true, // Allow PDA owner
        'finalized',
        { commitment: 'finalized' },
        TOKEN_2022_PROGRAM_ID
    );
    console.log("XLS Supply Vault:", xlsVaultSupply.address.toBase58());

    const rwaVaultLxr = await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        lxrMint,
        globalConfig,
        true,
        'finalized',
        { commitment: 'finalized' },
        TOKEN_2022_PROGRAM_ID
    );
    console.log("RWA LXR Vault:", rwaVaultLxr.address.toBase58());

    // Minting
    // Check balances first to avoid over-minting in multiple runs
    try {
        const xlsBal = (await connection.getTokenAccountBalance(xlsVaultSupply.address)).value.uiAmount;
        if (xlsBal < 20_250_000) {
            console.log("Minting XLS to Supply Vault...");
            await mintTo(
                connection,
                admin,
                xlsMint,
                xlsVaultSupply.address,
                admin.publicKey, // Mint Auth
                20_250_000 * 10 ** 9,
                [],
                { commitment: 'finalized' },
                TOKEN_2022_PROGRAM_ID
            );
            console.log("Minted XLS.");
        } else {
            console.log("XLS Supply already minted.");
        }

        const lxrVaultBal = (await connection.getTokenAccountBalance(rwaVaultLxr.address)).value.uiAmount;
        // Wait, where does LXR go initially? User didn't specify LXR distribution fully, assume Admin/Founder holds supply for sale?
        // Or is LXR minted on demand?
        // "Mint & Distribute LXR (2.025B)"
        // Let's mint to Admin for now to distribute manually/via DEX.

        const adminLxr = await getOrCreateAssociatedTokenAccount(
            connection, admin, lxrMint, admin.publicKey, false, 'finalized', { commitment: 'finalized' }, TOKEN_2022_PROGRAM_ID
        );

        const adminLxrBal = (await connection.getTokenAccountBalance(adminLxr.address)).value.uiAmount;
        if (adminLxrBal < 2_000_000_000) {
            console.log("Minting LXR to Admin...");
            await mintTo(
                connection,
                admin,
                lxrMint,
                adminLxr.address,
                admin.publicKey, // Mint Auth
                2_025_000_000 * 10 ** 9, // 2.025B
                [],
                { commitment: 'finalized' },
                TOKEN_2022_PROGRAM_ID
            );
            console.log("Minted LXR.");
        }

    } catch (e) {
        console.error("Error minting:", e);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
