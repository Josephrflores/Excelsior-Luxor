import * as anchor from "@coral-xyz/anchor";
import {
    createSetTransferFeeInstruction,
    TOKEN_2022_PROGRAM_ID,
    getTransferFeeConfig
} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    Transaction,
    sendAndConfirmTransaction
} from "@solana/web3.js";
import fs from 'fs';

async function main() {
    // 1. Setup
    let provider: anchor.AnchorProvider;
    if (process.env.ANCHOR_PROVIDER_URL) {
        provider = anchor.AnchorProvider.env();
    } else {
        console.log("Env vars missing, using fallback (Devnet)...");
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");
        const secret = JSON.parse(fs.readFileSync("./wallets/admin.json", 'utf8'));
        const wallet = new anchor.Wallet(Keypair.fromSecretKey(new Uint8Array(secret)));
        provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    }
    const connection = provider.connection;
    const admin = (provider.wallet as anchor.Wallet).payer;

    // 2. Load LXR Mint
    const lxrMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("./wallets/lxr_mint.json", 'utf8'))));
    const lxrMint = lxrMintKp.publicKey;

    console.log("Updating Fees for LXR:", lxrMint.toBase58());

    // 3. Set Fee to 1% (100 basis points)
    // Authority is Admin
    const FEE_BASIS_POINTS = 100; // 1%
    const MAX_FEE = BigInt(100_000 * 10 ** 9); // Keep Cap same

    const transaction = new Transaction().add(
        createSetTransferFeeInstruction(
            lxrMint,
            admin.publicKey, // Authority
            [], // Signers
            FEE_BASIS_POINTS,
            MAX_FEE,
            TOKEN_2022_PROGRAM_ID
        )
    );

    console.log("Sending Fee Update Transaction...");
    const sig = await sendAndConfirmTransaction(connection, transaction, [admin], { commitment: 'confirmed' });
    console.log("Fees Updated! Sig:", sig);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
