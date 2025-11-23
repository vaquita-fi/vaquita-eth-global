import { AuthButtons, Providers } from '@/components';
import { WithHydrated } from '@/core-ui/components';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Vaquita App',
  description: 'La forma más segura y divertida de generar ahorros con el poder de la blockchain',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();

  return (
    <html lang="es">
      <body className="min-h-dvh flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <WithHydrated>
          <Providers>
            <div className="h-14 shrink-0 flex justify-between bg-primary">
              {/* show the logo just mobile and tablet */}
              <div className="md:hidden">
                <Image src="/vaquita/vaquita_logo.png" alt="Vaquita" width={180} height={180} />
              </div>
              <AuthButtons />
            </div>
            <main className="flex-1 min-h-0 overflow-auto">{children}</main>
          </Providers>
        </WithHydrated>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
