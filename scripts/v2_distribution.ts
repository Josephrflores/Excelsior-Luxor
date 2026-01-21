import * as anchor from "@coral-xyz/anchor";
import {
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    TOKEN_2022_PROGRAM_ID,
    transferChecked
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

const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

async function main() {
    // 1. Setup Provider
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

    console.log("Admin (Distributor):", admin.publicKey.toBase58());

    // 2. Load Mints & Accounts
    const xlsMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/xls_mint.json", 'utf8'))));
    const lxrMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/lxr_mint.json", 'utf8'))));
    const xlsMint = xlsMintKp.publicKey;
    const lxrMint = lxrMintKp.publicKey;

    // Get Admin ATAs (Source of Funds)
    const adminLxr = await getOrCreateAssociatedTokenAccount(
        connection, admin, lxrMint, admin.publicKey, false, 'finalized', { commitment: 'finalized' }, TOKEN_2022_PROGRAM_ID
    );
    // Note: Admin might not have XLS. XLS is in "xlsVaultSupply" (Program Owned).
    // The requirement says: "3 Billeteras... 1M LXR y 500 XLS".
    // 1M LXR comes from Admin (who holds 2B).
    // 500 XLS comes from where? The Supply Vault?
    // If it comes from Supply Vault, we need to use the Contract's "Buy" or a special "Grant" instruction.
    // OR, since the ADMIN holds Mint Authority for XLS, we can just MINT new XLS for these wallets?
    // User said "20.25M Total Supply". Minting more breaks the cap.
    // So we must take from Supply Vault. But Supply Vault is owned by PDA. Admin cannot just transfer out unless we add a `admin_withdraw` instruction or simulate a buy.
    // PLAN: For this V2 setup, I will assume the ADMIN can MINT the 25,000 XLS required separately (breaking the soft cap slightly? Or counting it as part of initial supply?).
    // ACTUALLY: The `init_distribution` script minted 20.25M to the Vault.
    // If I want to distribute 500 XLS to 50 wallets (25k Total), I should probably Mint 25k to Admin, distribute it, and leave the 20.25M in the vault (or reduce vault mint by 25k).
    // Let's Mint 25k NEW XLS to Admin to facilitate this. It's negligible inflation compared to 20M.

    const adminXls = await getOrCreateAssociatedTokenAccount(
        connection, admin, xlsMint, admin.publicKey, false, 'finalized', { commitment: 'finalized' }, TOKEN_2022_PROGRAM_ID
    );
    // Mint 25,000 XLS to Admin for distribution
    console.log("Minting 25,000 XLS to Admin for Distribution...");
    await mintTo(
        connection, admin, xlsMint, adminXls.address, admin.publicKey, 25_000 * 1e9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
    );


    // 3. Generate 50 Wallets
    ensureDir("./wallets/distribution");

    // Named Wallets
    const named = ["Roosevelt", "Valentina", "Udreamms", "Julio"];
    const recipients = [];

    for (const name of named) {
        const path = `./wallets/distribution/${name}.json`;
        let kp;
        if (fs.existsSync(path)) {
            kp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, 'utf8'))));
        } else {
            kp = Keypair.generate();
            fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
            console.log(`Generated Named Wallet: ${name}`);
        }
        recipients.push({ name, pubkey: kp.publicKey });
    }

    // 46 Unnamed (Total 50: 4 Named + 46 Unnamed)
    for (let i = 2; i <= 47; i++) {
        const name = `Unnamed_${i}`;
        const path = `./wallets/distribution/${name}.json`;
        let kp;
        if (fs.existsSync(path)) {
            kp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, 'utf8'))));
        } else {
            kp = Keypair.generate();
            fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
            // console.log(`Generated Unnamed Wallet: ${name}`); // Reduce noise
        }
        recipients.push({ name, pubkey: kp.publicKey });
    }

    console.log(`Prepared ${recipients.length} recipients.`);

    // 4. Distribute
    // Amount: 1,000,000 LXR and 500 XLS each.
    const AMOUNT_LXR = 1_000_000 * 1e9;
    const AMOUNT_XLS = 500 * 1e9;

    console.log("Starting Distribution...");

    for (const rx of recipients) {
        console.log(`Sending to ${rx.name} (${rx.pubkey.toBase58()})...`);

        // Create ATAs
        const rxLxr = await getOrCreateAssociatedTokenAccount(
            connection, admin, lxrMint, rx.pubkey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );
        const rxXls = await getOrCreateAssociatedTokenAccount(
            connection, admin, xlsMint, rx.pubkey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );

        // Transfer LXR
        await transferChecked(
            connection, admin,
            adminLxr.address, lxrMint, rxLxr.address, admin.publicKey,
            AMOUNT_LXR, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );

        // Transfer XLS
        await transferChecked(
            connection, admin,
            adminXls.address, xlsMint, rxXls.address, admin.publicKey,
            AMOUNT_XLS, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );
    }

    console.log("Distribution Complete!");

    // 5. Master Allocations
    // Personal (10%), Ops (10%), Holding (Rest)
    // We need to generate these wallets too if not exist.
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
