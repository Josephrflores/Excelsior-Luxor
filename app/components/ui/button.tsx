import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    isLoading?: boolean;
}

export function Button({ children, className, variant = 'primary', isLoading, disabled, ...props }: ButtonProps) {
    const baseStyles = "flex items-center justify-center font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20",
        secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10",
        outline: "bg-transparent border border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {children}
        </button>
    );
}
