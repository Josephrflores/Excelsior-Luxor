import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, publicKey, percentAmount } from '@metaplex-foundation/umi';
import { createV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair, Connection } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

// Configuration
const RPC_URL = "https://api.devnet.solana.com";
const ADMIN_WALLET_PATH = "./wallets/admin.json";

// Mints (Load from files or hardcode based on successful deployment)
const XLS_MINT_PATH = "./wallets/xls_mint.json";
const LXR_MINT_PATH = "./wallets/lxr_mint.json";

async function main() {
    console.log("Initializing Umi...");
    const connection = new Connection(RPC_URL);
    const umi = createUmi(RPC_URL);

    // Load Admin
    const adminSecret = new Uint8Array(JSON.parse(fs.readFileSync(ADMIN_WALLET_PATH, 'utf8')));
    const adminKeypair = Keypair.fromSecretKey(adminSecret);
    const adminSigner = createSignerFromKeypair(umi, fromWeb3JsKeypair(adminKeypair));
    umi.use(signerIdentity(adminSigner));

    console.log("Admin:", adminSigner.publicKey);

    // Load Mints
    const xlsMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(XLS_MINT_PATH, 'utf8'))));
    const lxrMintKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(LXR_MINT_PATH, 'utf8'))));

    const xlsMint = fromWeb3JsPublicKey(xlsMintKp.publicKey);
    const lxrMint = fromWeb3JsPublicKey(lxrMintKp.publicKey);
    const splToken2022 = fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID);

    console.log("XLS Mint:", xlsMint);
    console.log("LXR Mint:", lxrMint);

    // Metadata Data
    // Note: User provided image URLs. We need to point 'uri' to valid JSON metadata.
    // I will construct a 'data:application/json;base64' URI if length permits, OR use raw github assuming user uploads it.
    // User repo: https://github.com/Josephrflores/Excelsior-Luxor
    // Expected JSON paths:
    // https://raw.githubusercontent.com/Josephrflores/Excelsior-Luxor/main/excelsior.json
    // https://raw.githubusercontent.com/Josephrflores/Excelsior-Luxor/main/luxor.json

    // 1. Add Metadata to XLS
    console.log("Adding Metadata to XLS...");
    try {
        await createV1(umi, {
            mint: xlsMint,
            authority: adminSigner,
            payer: adminSigner,
            name: "Excelsior",
            symbol: "XLS",
            uri: "https://raw.githubusercontent.com/Josephrflores/Excelsior-Luxor/main/excelsior.json",
            sellerFeeBasisPoints: percentAmount(0),
            tokenStandard: TokenStandard.Fungible,
            splTokenProgram: splToken2022,
        }).sendAndConfirm(umi);
        console.log("XLS Metadata Added!");
    } catch (e: any) {
        if (e.message.includes("already in use")) {
            console.log("XLS Metadata already exists.");
        } else {
            console.error("Error XLS:", e);
        }
    }

    // 2. Add Metadata to LXR
    console.log("Adding Metadata to LXR...");
    try {
        await createV1(umi, {
            mint: lxrMint,
            authority: adminSigner,
            payer: adminSigner,
            name: "Luxor",
            symbol: "LXR",
            uri: "https://raw.githubusercontent.com/Josephrflores/Excelsior-Luxor/main/luxor.json",
            sellerFeeBasisPoints: percentAmount(0),
            tokenStandard: TokenStandard.Fungible,
            splTokenProgram: splToken2022,
        }).sendAndConfirm(umi);
        console.log("LXR Metadata Added!");
    } catch (e: any) {
        if (e.message.includes("already in use")) {
            console.log("LXR Metadata already exists.");
        } else {
            console.error("Error LXR:", e);
        }
    }

    console.log("Metadata updates complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
