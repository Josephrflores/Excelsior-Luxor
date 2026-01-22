
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const WALLETS_DIR = path.join(__dirname, "../wallets");
const OUTPUT_FILE = path.join(__dirname, "../web-admin/lib/wallet-addresses.json");

interface WalletInfo {
    name: string;
    address: string;
    type: "Master" | "Distribution" | "System";
}

const exportAddresses = async () => {
    const wallets: WalletInfo[] = [];

    // 1. Process Master Wallets
    const masters = ["master_personal", "master_operations", "master_holding", "master_reserve"];
    for (const name of masters) {
        try {
            const raw = fs.readFileSync(path.join(WALLETS_DIR, `${name}.json`), "utf-8");
            const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
            wallets.push({ name: name, address: kp.publicKey.toBase58(), type: "Master" });
        } catch (e) {
            console.log(`Skipping ${name}: ${e}`);
        }
    }

    // 2. Process Distribution Wallets (Named)
    const named = ["Roosevelt", "Valentina", "Udreamms", "Julio"];
    for (const name of named) {
        try {
            const raw = fs.readFileSync(path.join(WALLETS_DIR, "distribution", `${name}.json`), "utf-8");
            const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
            wallets.push({ name: name, address: kp.publicKey.toBase58(), type: "Distribution" });
        } catch (e) {
            console.log(`Skipping ${name}: ${e}`);
        }
    }

    // 3. Process Unnamed Distribution Wallets
    // Based on scripts/v2_distribution.ts, it goes up to 50 total. named (4) + unnamed (46).
    // Unnamed start at index 2? Let's check the dir actually.
    const distDir = path.join(WALLETS_DIR, "distribution");
    if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir);
        for (const file of files) {
            if (file.startsWith("Unnamed_") && file.endsWith(".json")) {
                const raw = fs.readFileSync(path.join(distDir, file), "utf-8");
                const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
                const name = file.replace(".json", "");
                wallets.push({ name: name, address: kp.publicKey.toBase58(), type: "Distribution" });
            }
        }
    }

    // 4. System Wallets (Admin)
    try {
        // Admin is usually saved_keypair.json or similar, let's look for admin.json in wallets if it exists, otherwise standard location
        // Based on previous context, Admin funds things. Let's assume there is an admin.json or we skip.
        // The user mentioned "admin.json" in wallets.md
        if (fs.existsSync(path.join(WALLETS_DIR, "admin.json"))) {
            const raw = fs.readFileSync(path.join(WALLETS_DIR, "admin.json"), "utf-8");
            const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
            wallets.push({ name: "Admin", address: kp.publicKey.toBase58(), type: "System" });
        }
    } catch (e) { }


    // Write to web-admin
    // Ensure dir exists
    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(wallets, null, 2));
    console.log(`Exported ${wallets.length} public keys to ${OUTPUT_FILE}`);
};

exportAddresses();
