import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

export function saveKeypairToFile(keypair: Keypair, fileName: string) {
    const walletsDir = path.join(process.cwd(), "wallets");
    if (!fs.existsSync(walletsDir)) {
        fs.mkdirSync(walletsDir, { recursive: true });
    }

    const filePath = path.join(walletsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`Keypair saved to ${filePath}`);
    console.log(`Public Key: ${keypair.publicKey.toBase58()}`);
}

export function loadKeypairFromFile(fileName: string): Keypair {
    const filePath = path.join(process.cwd(), "wallets", fileName);
    const secretKeyString = fs.readFileSync(filePath, { encoding: 'utf8' });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return Keypair.fromSecretKey(secretKey);
}
