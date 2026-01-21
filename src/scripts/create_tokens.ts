import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    PublicKey
} from "@solana/web3.js";
import {
    ExtensionType,
    createInitializeMintInstruction,
    getMintLen,
    TOKEN_2022_PROGRAM_ID,
    createInitializeTransferFeeConfigInstruction,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccount
} from "@solana/spl-token";
import { loadKeypairFromFile, saveKeypairToFile } from "../utils/keypair";

const CONNECTION = new Connection("https://api.devnet.solana.com", "confirmed");

// Token Configs
const XLS_SUPPLY = 20_250_000 * 10 ** 9;
const LXR_SUPPLY = 2_025_000_000 * 10 ** 9;
const DECIMALS = 9;

// Feature Configs
const FEE_BASIS_POINTS = 100; // 1%
const MAX_FEE = 300; // Hard Cap 3% (Not directly enforcing cap here, just initial calc if needed, but FeeConfig takes MaxFee param)
// Actually TransferFeeConfig takes "maximumFee" in tokens. 
// We will set a high max fee in tokens to avoid blocking, but the percentage is what matters.
const MAX_FEE_TOKENS = BigInt(LXR_SUPPLY); // Just a high number so 3% isn't capped by absolute value unexpectedly

async function createExcelsior(payer: Keypair) {
    console.log("Creating Excelsior (XLS)...");
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    saveKeypairToFile(mintKeypair, "xls_mint.json");

    const mintLen = getMintLen([]);
    const lamports = await CONNECTION.getMinimumBalanceForRentExemption(mintLen);

    const matchTrx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mint,
            space: mintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mint, DECIMALS, payer.publicKey, payer.publicKey, TOKEN_2022_PROGRAM_ID)
    );

    await sendAndConfirmTransaction(CONNECTION, matchTrx, [payer, mintKeypair]);
    console.log(`XLS Mint Created: ${mint.toBase58()}`);

    // Mint Supply to Admin
    console.log("Minting XLS Supply to Admin...");
    const adminTokenParams = await getOrCreateAssociatedTokenAccount(
        CONNECTION, payer, mint, payer.publicKey, false, "confirmed", undefined, TOKEN_2022_PROGRAM_ID
    );

    await mintTo(
        CONNECTION, payer, mint, adminTokenParams.address, payer, XLS_SUPPLY, [], undefined, TOKEN_2022_PROGRAM_ID
    );
    console.log("XLS Supply Minted.");
}

async function createLuxor(payer: Keypair) {
    console.log("Creating Luxor (LXR) with Transfer Fees...");
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    saveKeypairToFile(mintKeypair, "lxr_mint.json");

    const extensions = [ExtensionType.TransferFeeConfig];
    const mintLen = getMintLen(extensions);
    const lamports = await CONNECTION.getMinimumBalanceForRentExemption(mintLen);

    const transaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mint,
            space: mintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        // Initialize Transfer Fee Config
        createInitializeTransferFeeConfigInstruction(
            mint,
            payer.publicKey, // Transfer Fee Config Authority
            payer.publicKey, // Withdraw Withheld Authority
            FEE_BASIS_POINTS,
            MAX_FEE_TOKENS,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(mint, DECIMALS, payer.publicKey, payer.publicKey, TOKEN_2022_PROGRAM_ID)
    );

    await sendAndConfirmTransaction(CONNECTION, transaction, [payer, mintKeypair]);
    console.log(`LXR Mint Created: ${mint.toBase58()}`);

    // Mint Supply to Admin
    console.log("Minting LXR Supply to Admin...");
    const adminTokenParams = await getOrCreateAssociatedTokenAccount(
        CONNECTION, payer, mint, payer.publicKey, false, "confirmed", undefined, TOKEN_2022_PROGRAM_ID
    );

    await mintTo(
        CONNECTION, payer, mint, adminTokenParams.address, payer, LXR_SUPPLY, [], undefined, TOKEN_2022_PROGRAM_ID
    );
    console.log("LXR Supply Minted.");
}

async function main() {
    const admin = loadKeypairFromFile("admin.json");
    console.log(`Using Admin: ${admin.publicKey.toBase58()}`);

    // Check Balance
    const balance = await CONNECTION.getBalance(admin.publicKey);
    if (balance < 2 * 10 ** 9) {
        console.log("Requesting Airdrop...");
        const sig = await CONNECTION.requestAirdrop(admin.publicKey, 2 * 10 ** 9);
        await CONNECTION.confirmTransaction(sig);
    }

    try {
        await createExcelsior(admin);
        await createLuxor(admin);
        console.log("Tokens Created Successfully!");
    } catch (err) {
        console.error("Error creating tokens:", err);
    }
}

main().catch(console.error);
