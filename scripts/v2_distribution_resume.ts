import * as anchor from "@coral-xyz/anchor";
import {
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    TOKEN_2022_PROGRAM_ID,
    transferChecked,
    getAccount
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
    const connection = provider.connection;
    const admin = (provider.wallet as anchor.Wallet).payer;

    console.log("Resuming Distribution from Admin:", admin.publicKey.toBase58());

    // Load Mints
    const xlsMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/xls_mint.json", 'utf8'))));
    const lxrMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/lxr_mint.json", 'utf8'))));
    const xlsMint = xlsMintKp.publicKey;
    const lxrMint = lxrMintKp.publicKey;

    // Admin ATAs
    const adminLxr = await getOrCreateAssociatedTokenAccount(
        connection, admin, lxrMint, admin.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
    );
    const adminXls = await getOrCreateAssociatedTokenAccount(
        connection, admin, xlsMint, admin.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
    );

    // --- 1. The 50 Wallets ---
    ensureDir("./wallets/distribution");

    const recipients = [];
    // Named
    ["Roosevelt", "Valentina", "Udreamms"].forEach(name => {
        const secret = JSON.parse(fs.readFileSync(`./wallets/distribution/${name}.json`, 'utf8'));
        recipients.push({ name, pubkey: Keypair.fromSecretKey(new Uint8Array(secret)).publicKey });
    });
    // Unnamed
    for (let i = 1; i <= 47; i++) {
        const name = `Unnamed_${i}`;
        const secret = JSON.parse(fs.readFileSync(`./wallets/distribution/${name}.json`, 'utf8'));
        recipients.push({ name, pubkey: Keypair.fromSecretKey(new Uint8Array(secret)).publicKey });
    }

    const TARGET_LXR = 1_000_000 * 1e9;
    const TARGET_XLS = 500 * 1e9;

    console.log(`Checking ${recipients.length} wallets...`);

    for (const rx of recipients) {
        // Check LXR Balance
        let needsLxr = false;
        const rxLxr = await getOrCreateAssociatedTokenAccount(
            connection, admin, lxrMint, rx.pubkey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );
        if (Number(rxLxr.amount) < TARGET_LXR * 0.9) { // Tolerance check
            // Send LXR
            try {
                console.log(`Sending LXR to ${rx.name}...`);
                await transferChecked(
                    connection, admin, adminLxr.address, lxrMint, rxLxr.address, admin.publicKey,
                    TARGET_LXR, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
                );
            } catch (e) { console.error(`Failed LXR to ${rx.name}`, e); }
        } else {
            console.log(`${rx.name} LXR OK.`);
        }

        // Check XLS Balance
        const rxXls = await getOrCreateAssociatedTokenAccount(
            connection, admin, xlsMint, rx.pubkey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );
        if (Number(rxXls.amount) < TARGET_XLS * 0.9) {
            try {
                console.log(`Sending XLS to ${rx.name}...`);
                await transferChecked(
                    connection, admin, adminXls.address, xlsMint, rxXls.address, admin.publicKey,
                    TARGET_XLS, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
                );
            } catch (e) { console.error(`Failed XLS to ${rx.name}`, e); }
        } else {
            // console.log(`${rx.name} XLS OK.`);
        }
    }

    // --- 2. Master Allocations ---
    // Wallets
    const ensureWallet = (name: string): PublicKey => {
        const path = `./wallets/${name}.json`;
        if (fs.existsSync(path)) return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, 'utf8')))).publicKey;
        // If not exists, gen
        const kp = Keypair.generate();
        fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
        console.log(`Created Master Wallet: ${name}`);
        return kp.publicKey;
    };

    const personal = ensureWallet("master_personal");
    const ops = ensureWallet("master_operations");
    const holding = ensureWallet("master_holding");
    // Market is likely the Admin remaining balance or a specific wallet? 
    // "Restante 65% para el Mercado" -> Usually implies Liquidity Pool or Treasury. Let's keep in Admin for now or create "master_market".
    const market = ensureWallet("master_market");

    const ALLOCATIONS = [
        { name: "Personal", pubkey: personal, lxr: 202_500_000, xls: 2_025_000 },
        { name: "Operations", pubkey: ops, lxr: 202_500_000, xls: 2_025_000 },
        { name: "Holding", pubkey: holding, lxr: 253_750_000, xls: 3_012_500 }, // Deducted amount
        { name: "Market", pubkey: market, lxr: 1_316_250_000, xls: 13_162_500 },
    ];

    console.log("Processing Master Allocations...");

    for (const alloc of ALLOCATIONS) {
        // Minting XLS for Master?
        // Note: We originally only minted 25k XLS for the 50 wallets. 
        // The Master Allocations involve MILLIONS of XLS (e.g. 13M for Market).
        // This XLS must come from the Supply Vault ( PDA ) or New Minting.
        // Since Admin is Mint Auth, we should Mint it to them to fulfill the allocation plan.

        // 1. LXR Transfer (From Admin Balance)
        const destLxr = await getOrCreateAssociatedTokenAccount(connection, admin, lxrMint, alloc.pubkey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
        if (Number(destLxr.amount) < 100) { // Check if empty
            const amount = BigInt(alloc.lxr) * BigInt(1e9);
            console.log(`Sending ${alloc.lxr} LXR to ${alloc.name}...`);
            try {
                await transferChecked(
                    connection, admin, adminLxr.address, lxrMint, destLxr.address, admin.publicKey,
                    amount, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
                );
            } catch (e) { console.log(`Skipping LXR to ${alloc.name} (funds low? or done)`, e.message); }
        }

        // 2. XLS Transfer (Need to Mint first?)
        const destXls = await getOrCreateAssociatedTokenAccount(connection, admin, xlsMint, alloc.pubkey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
        if (Number(destXls.amount) < 100) {
            const amount = BigInt(alloc.xls) * BigInt(1e9);
            console.log(`Minting/Sending ${alloc.xls} XLS to ${alloc.name}...`);
            // Mint directly to destination to save a step (and gas)
            try {
                await mintTo(
                    connection, admin, xlsMint, destXls.address, admin.publicKey,
                    amount, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
                );
            } catch (e) { console.error(`Failed Mint XLS to ${alloc.name}`, e); }
        }
    }

    console.log("Master Allocation Complete.");
}

main().catch(e => console.error(e));
