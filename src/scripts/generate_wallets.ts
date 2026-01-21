import { Keypair } from "@solana/web3.js";
import { saveKeypairToFile } from "../utils/keypair";

const WALLET_NAMES = [
    "admin",           // Admin/Creator (Controla metadatos, fees)
    "personal",        // Personal (10% Supply)
    "operations",      // Operaciones (10% Supply)
    "holding",         // Holding (15% Supply)
    "central_vault",   // Bóveda Central (65% Supply - Venta)
    "rwa_vault",       // Bóveda RWA (Respaldo propiedades + 50% Fees + 70% Swaps)
    "founder_vault",   // Bóveda Fundador (50% Fees)
    "fees_collector",  // Recolectora (Intermediaria para cobrar fees del Mint)
    "rewards_pool"     // Rewards/Ecosistema (Inflation + Activity Mining)
];

async function main() {
    console.log("Generating Excelsior Ecosystem Wallets...");

    for (const name of WALLET_NAMES) {
        const keypair = Keypair.generate();
        saveKeypairToFile(keypair, `${name}.json`);
    }

    console.log("\nAll wallets generated successfully in /wallets directory.");
}

main().catch(console.error);
