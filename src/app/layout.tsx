import type { Metadata, Viewport } from 'next';
import { Archivo, Geist, Geist_Mono, Mukta, Shrikhand } from 'next/font/google';
import type { ReactNode } from 'react';
import { siteConfig } from '@/config/site';
import './globals.css';

/*
 * The brand's voices (see DESIGN.md), loaded once for the site, the owner app and the TVs: Archivo for
 * headlines and the TV's headings and prices, Geist for text, Geist Mono for labels and logs.
 * Mukta carries Devanagari for Hindi menus.
 * Shrikhand stays only until the owner app moves to the brand.
 */
const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'], display: 'swap' });
const geist = Geist({ variable: '--font-geist', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });
const shrikhand = Shrikhand({ variable: '--font-shrikhand', subsets: ['latin'], weight: '400', display: 'swap' });
const mukta = Mukta({ variable: '--font-mukta', subsets: ['latin', 'devanagari'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#f2f0ea',
  colorScheme: 'light',
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${archivo.variable} ${geist.variable} ${geistMono.variable} ${shrikhand.variable} ${mukta.variable} antialiased`} suppressHydrationWarning>
      {/* Browser extensions add attributes to <body> before hydration; this covers only <body>'s own attributes. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
