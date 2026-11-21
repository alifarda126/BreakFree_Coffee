import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';

const plusJakartaSans = localFont({
  src: './fonts/PlusJakartaSans-Variable.woff2',
  variable: '--font-plus-jakarta-sans',
  weight: '400 700',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Breakfree Coffee SI | Sistem Informasi Operasional Outlet',
  description:
    'Monitoring persediaan, pencatatan spoil/waste, retur BOP H+1, Purchase Order, dan rekap omzet POS Pawoon Breakfree Coffee Malang.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} min-h-screen antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
