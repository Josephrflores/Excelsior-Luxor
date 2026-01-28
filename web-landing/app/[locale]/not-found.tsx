'use client';

import { Link } from '@/i18n/routing';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-gray-400 mb-8">The page you are looking for does not exist.</p>
            <Link href="/" className="px-6 py-3 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">
                Go Home
            </Link>
        </div>
    );
}
