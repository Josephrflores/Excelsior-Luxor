
import {
    getAssociatedTokenAddress,
    TOKEN_2022_PROGRAM_ID,
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

function loadKeypair(path: string): Keypair | null {
    if (!fs.existsSync(path)) return null;
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, 'utf8'))));
}

async function getBalance(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<number> {
    try {
        const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_2022_PROGRAM_ID);
        const bal = await connection.getTokenAccountBalance(ata);
        return bal.value.uiAmount || 0;
    } catch (e) {
        return 0;
    }
}

async function main() {
    console.log("Starting Balance Audit...");
    const connection = new Connection(RPC_URL, "confirmed");

    const xlsMintKp = loadKeypair(XLS_MINT_PATH)!;
    const lxrMintKp = loadKeypair(LXR_MINT_PATH)!;
    const xlsMint = xlsMintKp.publicKey;
    const lxrMint = lxrMintKp.publicKey;

    console.log("LXR Mint:", lxrMint.toBase58());
    console.log("XLS Mint:", xlsMint.toBase58());
    console.log("---------------------------------------------------");
    console.log(String("Wallet").padEnd(20) + String("LXR Balance").padEnd(20) + String("XLS Balance").padEnd(20));
    console.log("---------------------------------------------------");

    let totalLxr = 0;
    let totalXls = 0;

    // 1. Masters
    const masters = [
        { name: "Creator (Admin)", path: "./wallets/admin.json" },
        { name: "Personal", path: "./wallets/master_personal.json" },
        { name: "Operations", path: "./wallets/master_operations.json" },
        { name: "Holding", path: "./wallets/master_holding.json" },
        { name: "Reserve", path: "./wallets/master_reserve.json" },
    ];

    for (const m of masters) {
        const kp = loadKeypair(m.path);
        if (!kp) continue;
        const lxr = await getBalance(connection, lxrMint, kp.publicKey);
        const xls = await getBalance(connection, xlsMint, kp.publicKey);

        console.log(m.name.padEnd(20) + lxr.toLocaleString().padEnd(20) + xls.toLocaleString().padEnd(20));
        totalLxr += lxr;
        totalXls += xls;
    }

    console.log("---------------------------------------------------");

    // 2. Named Distribution
    const named = ["Roosevelt", "Valentina", "Udreamms", "Julio"];
    for (const name of named) {
        const kp = loadKeypair(`./wallets/distribution/${name}.json`);
        if (!kp) {
            console.log(`${name} (Missing)`);
            continue;
        }
        const lxr = await getBalance(connection, lxrMint, kp.publicKey);
        const xls = await getBalance(connection, xlsMint, kp.publicKey);

        console.log(name.padEnd(20) + lxr.toLocaleString().padEnd(20) + xls.toLocaleString().padEnd(20));
        totalLxr += lxr;
        totalXls += xls;
    }

    // 3. Unnamed (Sample and Sum)
    // We iterate all 46 unnamed wallets (Unnamed_2 to Unnamed_47)
    let unnamedLxr = 0;
    let unnamedXls = 0;
    let count = 0;

    for (let i = 2; i <= 47; i++) {
        const kp = loadKeypair(`./wallets/distribution/Unnamed_${i}.json`);
        if (!kp) continue;
        const lxr = await getBalance(connection, lxrMint, kp.publicKey);
        const xls = await getBalance(connection, xlsMint, kp.publicKey);
        unnamedLxr += lxr;
        unnamedXls += xls;
        count++;
    }

    console.log(`Unnamed (x${count})`.padEnd(20) + unnamedLxr.toLocaleString().padEnd(20) + unnamedXls.toLocaleString().padEnd(20));
    totalLxr += unnamedLxr;
    totalXls += unnamedXls;

    console.log("---------------------------------------------------");
    console.log("TOTAL FOUND".padEnd(20) + totalLxr.toLocaleString().padEnd(20) + totalXls.toLocaleString().padEnd(20));
    console.log("TARGET SUPPLY".padEnd(20) + "2,025,000,000".padEnd(20) + "20,250,000".padEnd(20));

    const diffLxr = totalLxr - 2025000000;
    const diffXls = totalXls - 20250000;

    if (Math.abs(diffLxr) < 1) console.log("LXR Supply MATCHES ✅");
    else console.log(`LXR Supply MISMATCH ❌ (Diff: ${diffLxr})`);

    if (Math.abs(diffXls) < 1) console.log("XLS Supply MATCHES ✅");
    else console.log(`XLS Supply MISMATCH ❌ (Diff: ${diffXls})`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
