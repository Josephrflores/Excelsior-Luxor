
import {
    getAssociatedTokenAddress,
    TOKEN_2022_PROGRAM_ID,
    burn,
    mintTo,
    getOrCreateAssociatedTokenAccount
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

// Scales
const SCALE_LXR = 1_000_000_000; // 9 decimals
const SCALE_XLS = 1_000_000_000; // 9 decimals

// Allocation Table (Exact Targets)
const ALLOC = {
    // Masters
    personal: { lxr: 202_500_000, xls: 2_025_000 },
    operations: { lxr: 202_500_000, xls: 2_025_000 },
    holding: { lxr: 253_750_000, xls: 3_012_500 }, // 15% - Distribution
    reserve: { lxr: 1_316_250_000, xls: 13_162_500 }, // 65%

    // Distribution (Per Wallet)
    distribution: { lxr: 1_000_000, xls: 500 },

    // Creator (Should be 0)
    creator: { lxr: 0, xls: 0 }
};

function loadKeypair(path: string): Keypair | null {
    if (!fs.existsSync(path)) return null;
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, 'utf8'))));
}

async function forceBalance(
    connection: Connection,
    mint: PublicKey,
    owner: Keypair,
    mintAuth: Keypair, // Admin needed for minting/burning
    targetAmount: number,
    symbol: string,
    walletName: string
) {
    try {
        const ata = await getAssociatedTokenAddress(mint, owner.publicKey, false, TOKEN_2022_PROGRAM_ID);

        // Ensure ATA exists before checking balance (might fail if not created)
        // But getOrCreate is expensive/complex here if we just want to read.
        // Assuming wallets exist from previous runs. If not, catch error.
        let current = 0;
        try {
            const bal = await connection.getTokenAccountBalance(ata);
            current = bal.value.uiAmount || 0;
        } catch (e) {
            // Account doesn't exist, so balance is 0
            current = 0;
        }

        // precise diff
        const diff = current - targetAmount;
        const SCALE = SCALE_LXR; // Both 9 decimals

        if (Math.abs(diff) < 0.000001) {
            console.log(`  ✅ ${walletName} (${symbol}): Exact Match (${current})`);
            return;
        }

        if (diff > 0) {
            // BURN Excess
            console.log(`  🔥 ${walletName} (${symbol}): Exceeds by ${diff}. Burning...`);
            const amount = BigInt(Math.floor(diff * SCALE));

            // NOTE: Burn usually requires the OWNER to sign. 
            // We pass 'mintAuth' (Admin) as the PAYER (fee payer), but 'owner' must be the SIGNER/Authority.
            // burn(connection, payer, account, mint, authority, amount)
            await burn(
                connection,
                mintAuth, // Payer 
                ata,
                mint,
                owner, // Owner Authority 
                amount,
                [],
                { commitment: 'confirmed' },
                TOKEN_2022_PROGRAM_ID
            );
        } else {
            // MINT Shortfall
            const shortfall = Math.abs(diff);
            console.log(`  ➕ ${walletName} (${symbol}): Short by ${shortfall}. Minting...`);
            const amount = BigInt(Math.floor(shortfall * SCALE));

            // Needs ATA to exist to mint to it
            const recipientAta = await getOrCreateAssociatedTokenAccount(
                connection, mintAuth, mint, owner.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
            );

            await mintTo(
                connection, mintAuth, mint, recipientAta.address, mintAuth.publicKey, amount, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID
            );
        }
    } catch (e) {
        console.log(`  ❌ Error processing ${walletName} ${symbol}:`, e);
    }
}

async function main() {
    console.log("Starting Strict Allocation Enforcement...");
    const connection = new Connection(RPC_URL, "confirmed");

    const xlsMintKp = loadKeypair(XLS_MINT_PATH)!;
    const lxrMintKp = loadKeypair(LXR_MINT_PATH)!;
    const adminKp = loadKeypair("./wallets/admin.json")!;

    // 1. Masters
    const masters = [
        { name: "Creator (Admin)", kp: adminKp, alloc: ALLOC.creator },
        { name: "Personal", kp: loadKeypair("./wallets/master_personal.json"), alloc: ALLOC.personal },
        { name: "Operations", kp: loadKeypair("./wallets/master_operations.json"), alloc: ALLOC.operations },
        { name: "Holding", kp: loadKeypair("./wallets/master_holding.json"), alloc: ALLOC.holding },
        { name: "Reserve", kp: loadKeypair("./wallets/master_reserve.json"), alloc: ALLOC.reserve },
    ];

    for (const m of masters) {
        if (!m.kp) continue;
        await forceBalance(connection, lxrMintKp.publicKey, m.kp, adminKp, m.alloc.lxr, "LXR", m.name);
        await forceBalance(connection, xlsMintKp.publicKey, m.kp, adminKp, m.alloc.xls, "XLS", m.name);
    }

    // 2. Named Distribution
    const named = ["Roosevelt", "Valentina", "Udreamms", "Julio"];
    for (const name of named) {
        const kp = loadKeypair(`./wallets/distribution/${name}.json`);
        if (!kp) continue;
        await forceBalance(connection, lxrMintKp.publicKey, kp, adminKp, ALLOC.distribution.lxr, "LXR", name);
        await forceBalance(connection, xlsMintKp.publicKey, kp, adminKp, ALLOC.distribution.xls, "XLS", name);
    }

    // 3. Unnamed
    for (let i = 2; i <= 47; i++) {
        const kp = loadKeypair(`./wallets/distribution/Unnamed_${i}.json`);
        if (!kp) continue;
        // Batch log to avoid spam
        if (i === 2) console.log("Processing 46 Unnamed wallets...");

        await forceBalance(connection, lxrMintKp.publicKey, kp, adminKp, ALLOC.distribution.lxr, "LXR", `Unnamed_${i}`);
        await forceBalance(connection, xlsMintKp.publicKey, kp, adminKp, ALLOC.distribution.xls, "XLS", `Unnamed_${i}`);
    }

    console.log("Enforcement Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
