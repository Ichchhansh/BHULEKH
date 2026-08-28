import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BHULEKH LEDGER | Verifiable Digital Land Governance & Ownership Infrastructure',
  description: 'A sovereign digital land-record and ownership-management platform for India combining statutory government authority with cryptographic blockchain provenance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col justify-between">
        {children}
      </body>
    </html>
  );
}
