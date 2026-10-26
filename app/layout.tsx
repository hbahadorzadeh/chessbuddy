import type { Metadata } from 'next';
import './globals.css';
import {SiteFooter} from '@/components/site-footer';
export const metadata: Metadata = { title: 'ChessBuddy', description: 'Learn chess inside ChatGPT.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}<SiteFooter/></body></html>;
}
