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
} from "@solana/web3.js";
import fs from 'fs';
import { Program } from "@coral-xyz/anchor";

const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

async function main() {
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

    console.log("Upgrading Config with Admin:", admin.publicKey.toBase58());

    // Load IDL
    const idl = JSON.parse(fs.readFileSync("./target/idl/excelsior.json", "utf8"));
    const programId = new PublicKey("ACvdkCFF3piATdcAXQemmdu5FWXVHfv7kv4Y5vT3jawS");
    const program = new Program(idl, programId, provider);

    const [globalConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_config")],
        programId
    );

    // Mints
    if (!fs.existsSync("./wallets/xls_mint.json") || !fs.existsSync("./wallets/lxr_mint.json")) {
        throw new Error("Mints not found.");
    }
    const xlsMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/xls_mint.json", 'utf8'))));
    const lxrMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/lxr_mint.json", 'utf8'))));
    const xlsMint = xlsMintKp.publicKey;
    const lxrMint = lxrMintKp.publicKey;

    // Vaults (ATAs of GlobalConfig)
    console.log("Deriving Vaults...");

    // 1. XLS Supply Vault (Existing)
    const xlsVaultSupply = await getOrCreateAssociatedTokenAccount(
        connection, admin, xlsMint, globalConfig, true, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
    );
    console.log("XLS Supply Vault:", xlsVaultSupply.address.toBase58());

    // 2. RWA Vault LXR (Existing)
    const rwaVaultLxr = await getOrCreateAssociatedTokenAccount(
        connection, admin, lxrMint, globalConfig, true, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
    );
    console.log("RWA Vault LXR:", rwaVaultLxr.address.toBase58());

    // 3. LXR Reward Vault (NEW)
    const lxrVaultRewards = await getOrCreateAssociatedTokenAccount(
        connection, admin, lxrMint, globalConfig, true, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
    );
    console.log("LXR Reward Vault (NEW):", lxrVaultRewards.address.toBase58());


    // Call upgrade_config
    console.log("Sending Upgrade Transaction...");
    try {
        const tx = await program.methods
            .upgradeConfig()
            .accounts({
                admin: admin.publicKey,
                globalConfig: globalConfig,
                rwaVaultLxr: rwaVaultLxr.address,
                xlsVaultSupply: xlsVaultSupply.address,
                lxrVaultRewards: lxrVaultRewards.address,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        console.log("Upgrade Success! Tx:", tx);
    } catch (e) {
        console.error("Upgrade Failed:", e);
    }
}

main().catch(console.error);
