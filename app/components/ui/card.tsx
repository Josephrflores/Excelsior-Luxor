import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

export function Card({ children, className, title }: CardProps) {
    return (
        <div className={twMerge("glass-card p-6 flex flex-col gap-4", className)}>
            {title && (
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            )}
            {children}
        </div>
    );
}

export function CardValue({ label, value, subtext }: { label: string, value: string, subtext?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-gray-400 text-sm">{label}</span>
            <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
            {subtext && <span className="text-xs text-amber-500">{subtext}</span>}
        </div>
    );
}
