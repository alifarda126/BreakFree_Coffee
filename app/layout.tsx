import type { Metadata } from 'next';
import { Nunito_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono-code',
});

export const metadata: Metadata = {
  title: 'Breakfree Coffee SI — Sistem Informasi Operasional',
  description:
    'Monitoring persediaan, pencatatan spoil/waste, retur BOP H+1, Purchase Order, dan rekap omzet POS Pawoon Breakfree Coffee Malang.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${nunitoSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
