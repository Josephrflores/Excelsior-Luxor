import { Card, CardValue } from '@/components/ui/card';
import { Building2, TrendingUp, Wallet } from 'lucide-react';

export function RwaDashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                    <Building2 className="w-6 h-6" />
                </div>
                <CardValue label="Total Valuation" value="$50,000,000" subtext="+2.4% this month" />
            </Card>

            <Card className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <CardValue label="Backing Ratio" value="130%" subtext="Over-collateralized" />
            </Card>

            <Card className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                    <Wallet className="w-6 h-6" />
                </div>
                <CardValue label="Dividend Yield" value="8.4%" subtext="Paid weekly in LXR" />
            </Card>
        </div>
    );
}
