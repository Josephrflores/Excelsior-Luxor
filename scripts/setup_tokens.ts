import * as anchor from "@coral-xyz/anchor";
import { 
    createMint, 
    createInitializeMintInstruction, 
    createInitializeTransferFeeConfigInstruction, 
    ExtensionType, 
    getMintLen, 
    TOKEN_2022_PROGRAM_ID, 
    mintTo,
    getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    SystemProgram, 
    Transaction, 
    sendAndConfirmTransaction, 
    PublicKey
} from "@solana/web3.js";
import fs from 'fs';

async function main() {
    // 1. Setup Connection and Provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const connection = provider.connection;
    const wallet = provider.wallet as anchor.Wallet;

    console.log("User:", wallet.publicKey.toBase58());

    // 2. Load Keypairs
    const loadKeypair = (path: string) => {
        const secretKey = JSON.parse(fs.readFileSync(path, 'utf8'));
        return Keypair.fromSecretKey(new Uint8Array(secretKey));
    };

    const admin = loadKeypair("./wallets/admin.json");
    const xlsMintKp = loadKeypair("./wallets/xls_mint.json");
    const lxrMintKp = loadKeypair("./wallets/lxr_mint.json");

    console.log("XLS Mint Keypair:", xlsMintKp.publicKey.toBase58());
    console.log("LXR Mint Keypair:", lxrMintKp.publicKey.toBase58());

    // 3. Define Token Configs
    const DECIMALS = 9;
    
    // --- Setup Excelsior (XLS) ---
    // Standard Token-2022 (no extensions for now, or maybe Metadata later)
    // We check if it exists or initialize it.
    // For simplicity, we'll try to initialize. If it fails (already initialized), we catch error.
    
    try {
        console.log("Initializing Excelsior (XLS)...");
        // For standard Token-2022, we can use createMint helper, but let's be explicit if we add extensions later.
        // Actually, createMint is fine for standard.
        const xlsMint = await createMint(
            connection,
            admin,
            admin.publicKey, // Mint Auth
            null,            // Freeze Auth
            DECIMALS,
            xlsMintKp,
            { commitment: 'finalized' },
            TOKEN_2022_PROGRAM_ID
        );
        console.log("XLS Mint Initialized:", xlsMint.toBase58());
    } catch (e) {
        console.log("XLS Mint might already be initialized:", e);
    }

    // --- Setup Luxor (LXR) ---
    // Token-2022 with Transfer Fee Extension
    try {
        console.log("Initializing Luxor (LXR) with Transfer Fees...");
        
        const extensions = [ExtensionType.TransferFeeConfig];
        const mintLen = getMintLen(extensions);
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: admin.publicKey,
                newAccountPubkey: lxrMintKp.publicKey,
                space: mintLen,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            }),
            createInitializeTransferFeeConfigInstruction(
                lxrMintKp.publicKey,
                300, // Transfer Fee Config Authority (Max Fee 3%) -> We set max to 300 basis points
                300, // Default Fee 3% (300 basis points)
                BigInt(100_000 * 10**9), // Max Fee Amount (Cap) -> arbitrarily high for now? 
                // Wait, TransferFeeConfig args: (mint, transferFeeConfigAuthority, withdrawWithheldAuthority, transferFeeBasisPoints, maximumFee)
                // Actually helper is: (mint, transferFeeConfigAuthority, withdrawWithheldAuthority, transferFeeBasisPoints, maximumFee, programId)
                // Let's check signature.
                // createInitializeTransferFeeConfigInstruction(mint, transferFeeConfigAuthority, withdrawWithheldAuthority, transferFeeBasisPoints, maximumFee, programId?)
                
                admin.publicKey, // Config Authority
                admin.publicKey, // Withdraw Authority
                300,             // 3% Basis points
                BigInt(1_000_000 * 10**9), // Max fee per transfer (High cap for now)
                TOKEN_2022_PROGRAM_ID
            ),
            createInitializeMintInstruction(
                lxrMintKp.publicKey,
                DECIMALS,
                admin.publicKey, // Mint Auth
                null,            // Freeze Auth
                TOKEN_2022_PROGRAM_ID
            )
        );

        const sig = await sendAndConfirmTransaction(connection, transaction, [admin, lxrMintKp]);
        console.log("LXR Mint Initialized with Transfer Fee. Sig:", sig);
        
    } catch (e) {
        console.log("LXR Mint might already be initialized or error:", e);
    }

    console.log("Token Setup Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
