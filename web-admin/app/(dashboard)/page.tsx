
import WalletGrid from "@/components/WalletGrid";
import AdminControls from "@/components/AdminControls";
import walletData from "../../lib/wallet-addresses.json";

// Type assertion for the JSON import
const wallets = walletData as Array<{ name: string; address: string; type: "Master" | "Distribution" | "System" }>;

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Command Center</h2>
                <p className="text-slate-400">Real-time monitoring of the Excelsior Ecosystem.</p>
            </div>

            <AdminControls />

            <WalletGrid wallets={wallets} />
        </div>
    );
}
