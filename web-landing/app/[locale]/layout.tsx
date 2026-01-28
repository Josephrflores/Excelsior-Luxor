import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { WalletContextProvider } from '../../components/providers/WalletContextProvider';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import '../globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Excelsior Ecosystem | RWA on Solana',
  description: 'Decentralized finance backed by Real World Assets.',
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen flex flex-col`}>
        <NextIntlClientProvider messages={messages}>
          <WalletContextProvider>
            <Navbar />
            <main className="flex-grow pt-16">
              {children}
            </main>
            <Footer />
          </WalletContextProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
