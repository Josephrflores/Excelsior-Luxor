
import * as anchor from "@coral-xyz/anchor";
import {
    mintTo,
    getOrCreateAssociatedTokenAccount,
    TOKEN_2022_PROGRAM_ID,
    transferChecked
} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";
import fs from 'fs';

// Configuration
const RPC_URL = "https://api.devnet.solana.com";
const ADMIN_WALLET_PATH = "./wallets/admin.json";
const XLS_MINT_PATH = "./wallets/xls_mint.json";
const LXR_MINT_PATH = "./wallets/lxr_mint.json";

// Target Amounts (Scales)
const DECIMALS = 9;
const SCALE = 10 ** DECIMALS;

// Allocations
const ALLOC = {
    personal: { lxr: 202_500_000, xls: 2_025_000 },
    operations: { lxr: 202_500_000, xls: 2_025_000 },
    // Holding target is 15% MINUS the 50 allocations already done.
    // 15% LXR = 303,750,000. Less 50M = 253,750,000.
    // 15% XLS = 3,037,500. Less 25k = 3,012,500.
    holding: { lxr: 253_750_000, xls: 3_012_500 },
    reserve: { lxr: 1_316_250_000, xls: 13_162_500 }
};

const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

const getOrGenKeypair = (name: string): Keypair => {
    const path = `./wallets/${name}.json`;
    if (fs.existsSync(path)) {
        return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, 'utf8'))));
    } else {
        const kp = Keypair.generate();
        fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
        console.log(`Generated new wallet: ${name}`);
        return kp;
    }
}

async function main() {
    console.log("Starting Distribution Fix...");
    const connection = new Connection(RPC_URL, "confirmed");

    // Load Admin & Mints
    const admin = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(ADMIN_WALLET_PATH, 'utf8'))));
    const xlsMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(XLS_MINT_PATH, 'utf8'))));
    const lxrMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(LXR_MINT_PATH, 'utf8'))));

    console.log("Admin:", admin.publicKey.toBase58());

    // Load Master Wallets
    const personal = getOrGenKeypair("master_personal");
    const operations = getOrGenKeypair("master_operations");
    const holding = getOrGenKeypair("master_holding");
    const reserve = getOrGenKeypair("master_reserve"); // "Billetera Restante"

    const masters = [
        { name: "Personal", kp: personal, alloc: ALLOC.personal },
        { name: "Operations", kp: operations, alloc: ALLOC.operations },
        { name: "Holding", kp: holding, alloc: ALLOC.holding },
        { name: "Reserve", kp: reserve, alloc: ALLOC.reserve },
    ];

    // --- Fund LXR ---
    // Strategy: We already minted ~2B to Admin. We used 50M. Admin has ~1.95B.
    // Total Need: 2.025B.
    // Shortfall: 25M.
    // Plan: Mint Shortfall to Admin. Then Transfer to Masters.
    // Any remainder in Admin -> Reserve?
    // Actually, safer to Mint EXACT amounts needed to destinations if possible, but Admin holds the bulk supply.
    // Let's check Admin Balance.

    console.log("--- Processing LXR ---");
    const adminLxrAta = await getOrCreateAssociatedTokenAccount(
        connection, admin, lxrMintKp.publicKey, admin.publicKey, false, 'finalized', { commitment: 'finalized' }, TOKEN_2022_PROGRAM_ID
    );
    let lxrBal = await connection.getTokenAccountBalance(adminLxrAta.address);
    console.log(`Admin Current LXR: ${lxrBal.value.uiAmount}`);

    // If we need to top up to cover everything?
    // Total Master Needs: 202.5 + 202.5 + 253.75 + 1316.25 = 1,975,000,000.
    // Users took 50M.
    // Total = 2.025B.

    // Admin likely has 1.95B. We need 25M more. 
    // Wait, 1.95B is enough for 1.975B? No. Short 25M.
    // So Mint 25M to Admin.

    // Actually, let's just MINT DIRECTLY to the recipients for simplicity?
    // NO, Admin "Creator" wallet usually distributes. But Minting direct saves transfers.
    // User said Creator Wallet Balance = 0.
    // So let's Mint/Transfer such that Admin ends with 0.

    // Step 1: Drain Admin to Reserve.
    // Step 2: Mint whatever is missing to Reserve?
    // Step 3: Distribute from Reserve?
    // Simpler: Mint Shortfall to Admin. Distribute everything.

    // Mint mismatch fix (25M LXR)
    await mintTo(
        connection, admin, lxrMintKp.publicKey, adminLxrAta.address, admin.publicKey,
        25_000_000 * SCALE, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
    );
    console.log("Minted 25M LXR top-up to Admin.");

    for (const m of masters) {
        console.log(`Funding ${m.name} with ${m.alloc.lxr} LXR...`);
        const destAta = await getOrCreateAssociatedTokenAccount(
            connection, admin, lxrMintKp.publicKey, m.kp.publicKey, false, 'finalized', { commitment: 'finalized' }, TOKEN_2022_PROGRAM_ID
        );

        // Check if already funded to avoid double send?
        const bal = await connection.getTokenAccountBalance(destAta.address).catch(() => ({ value: { uiAmount: 0 } }));
        if (bal.value.uiAmount && bal.value.uiAmount >= m.alloc.lxr * 0.9) {
            console.log("  Already funded.");
            continue;
        }

        await transferChecked(
            connection, admin, adminLxrAta.address, lxrMintKp.publicKey, destAta.address, admin.publicKey,
            BigInt(m.alloc.lxr) * BigInt(SCALE), DECIMALS, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );
    }


    // --- Fund XLS ---
    // Strategy: Admin likely has ~0 XLS (minted 25k, sent 25k).
    // We need to Mint ALL the master allocations.
    // We will MINT DIRECTLY to the Master Wallets (via Admin Auth) to save gas/steps.
    // And verify Admin balance stays 0.

    console.log("--- Processing XLS ---");
    for (const m of masters) {
        console.log(`Funding ${m.name} with ${m.alloc.xls} XLS...`);
        const destAta = await getOrCreateAssociatedTokenAccount(
            connection, admin, xlsMintKp.publicKey, m.kp.publicKey, false, 'finalized', { commitment: 'finalized' }, TOKEN_2022_PROGRAM_ID
        );

        // Check if already funded
        const bal = await connection.getTokenAccountBalance(destAta.address).catch(() => ({ value: { uiAmount: 0 } }));
        if (bal.value.uiAmount && bal.value.uiAmount >= m.alloc.xls * 0.9) {
            console.log("  Already funded.");
            continue;
        }

        await mintTo(
            connection, admin, xlsMintKp.publicKey, destAta.address, admin.publicKey,
            BigInt(m.alloc.xls) * BigInt(SCALE), [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );
    }

    // Final check for Admin LXR dust
    lxrBal = await connection.getTokenAccountBalance(adminLxrAta.address);
    if (lxrBal.value.uiAmount && lxrBal.value.uiAmount > 0) {
        console.log(`Sweeping remaining ${lxrBal.value.uiAmount} LXR to Reserve...`);
        const reserveAta = await getOrCreateAssociatedTokenAccount(
            connection, admin, lxrMintKp.publicKey, reserve.publicKey, false, 'finalized', { commitment: 'finalized' }, TOKEN_2022_PROGRAM_ID
        );
        // We use transfer, not checked, or handle decimals carefully if dust is tiny.
        // Assuming checked is fine.
        await transferChecked(
            connection, admin, adminLxrAta.address, lxrMintKp.publicKey, reserveAta.address, admin.publicKey,
            BigInt(Math.floor(lxrBal.value.uiAmount! * SCALE)), DECIMALS, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
        );
    }

    console.log("Distribution Corrections Complete!");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
