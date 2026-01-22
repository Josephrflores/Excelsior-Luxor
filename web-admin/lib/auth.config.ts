import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
        error: '/login', // Error code passed in url query string as ?error=
        verifyRequest: '/login', // (used for check email message)
        newUser: '/' // If new user, redirect here
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/');
            const isLoginPage = nextUrl.pathname.startsWith('/login');

            // Allow access to login page always
            if (isLoginPage) return true;

            // Allow access to static assets (handled by matcher in middleware but good to be safe)
            if (nextUrl.pathname.startsWith('/_next')) return true;

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            }
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
