
import {
    getAssociatedTokenAddress,
    TOKEN_2022_PROGRAM_ID,
    burn
} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";
import fs from 'fs';

// Configuration
const RPC_URL = "https://api.devnet.solana.com";

// Mints
const XLS_MINT_PATH = "./wallets/xls_mint.json";
const LXR_MINT_PATH = "./wallets/lxr_mint.json";

// Targets
const SCALE = 1_000_000_000; // 9 decimals

// Allocation Table (Exact Targets)
const ALLOC = {
    // Masters
    personal: { lxr: 202_500_000, xls: 2_025_000 },
    operations: { lxr: 202_500_000, xls: 2_025_000 },
    holding: { lxr: 253_750_000, xls: 3_012_500 },
    reserve: { lxr: 1_316_250_000, xls: 13_162_500 },

    // Distribution (Per Wallet)
    distribution: { lxr: 1_000_000, xls: 500 },

    // Creator (Should be 0 ideally, or residue)
    creator: { lxr: 0, xls: 0 }
};

function loadKeypair(path: string): Keypair | null {
    if (!fs.existsSync(path)) return null;
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, 'utf8'))));
}

async function correctBalance(connection: Connection, mint: PublicKey, owner: Keypair, targetAmount: number, symbol: string) {
    try {
        const ata = await getAssociatedTokenAddress(mint, owner.publicKey, false, TOKEN_2022_PROGRAM_ID);
        const bal = await connection.getTokenAccountBalance(ata);
        const current = bal.value.uiAmount || 0;

        // precise diff calculation
        const diff = current - targetAmount;

        if (diff > 0.000001) {
            console.log(`  ${symbol} Excess: ${diff}. Burning...`);
            // Burn amount = diff * SCALE
            // Using Math.floor/round carefully
            const mountToBurn = BigInt(Math.floor(diff * SCALE));

            await burn(
                connection, owner, ata, mint, owner.publicKey, mountToBurn, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
            );
            console.log(`  Burned ${diff} ${symbol}.`);
        } else if (diff < -0.000001) {
            console.log(`  ${symbol} Shortfall: ${Math.abs(diff)}. (Burn script cannot fix shortfall)`);
        } else {
            // Match
        }
    } catch (e) {
        console.log(`  Error fixing ${symbol}:`, e);
    }
}

async function main() {
    console.log("Starting Excess Burn...");
    const connection = new Connection(RPC_URL, "confirmed");

    const xlsMintKp = loadKeypair(XLS_MINT_PATH)!;
    const lxrMintKp = loadKeypair(LXR_MINT_PATH)!;

    // 1. Masters
    const masters = [
        { name: "Creator (Admin)", path: "./wallets/admin.json", alloc: ALLOC.creator },
        { name: "Personal", path: "./wallets/master_personal.json", alloc: ALLOC.personal },
        { name: "Operations", path: "./wallets/master_operations.json", alloc: ALLOC.operations },
        { name: "Holding", path: "./wallets/master_holding.json", alloc: ALLOC.holding },
        { name: "Reserve", path: "./wallets/master_reserve.json", alloc: ALLOC.reserve },
    ];

    for (const m of masters) {
        console.log(`Checking ${m.name}...`);
        const kp = loadKeypair(m.path);
        if (!kp) continue;

        await correctBalance(connection, lxrMintKp.publicKey, kp, m.alloc.lxr, "LXR");
        await correctBalance(connection, xlsMintKp.publicKey, kp, m.alloc.xls, "XLS");
    }

    // 2. Named Distribution
    const named = ["Roosevelt", "Valentina", "Udreamms", "Julio"];
    for (const name of named) {
        console.log(`Checking ${name}...`);
        const kp = loadKeypair(`./wallets/distribution/${name}.json`);
        if (!kp) continue;

        await correctBalance(connection, lxrMintKp.publicKey, kp, ALLOC.distribution.lxr, "LXR");
        await correctBalance(connection, xlsMintKp.publicKey, kp, ALLOC.distribution.xls, "XLS");
    }

    // 3. Unnamed
    for (let i = 2; i <= 47; i++) {
        // console.log(`Checking Unnamed_${i}...`); // Reduce noise
        const kp = loadKeypair(`./wallets/distribution/Unnamed_${i}.json`);
        if (!kp) continue;

        await correctBalance(connection, lxrMintKp.publicKey, kp, ALLOC.distribution.lxr, "LXR");
        await correctBalance(connection, xlsMintKp.publicKey, kp, ALLOC.distribution.xls, "XLS");
    }

    console.log("Burn Correction Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
