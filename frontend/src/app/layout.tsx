import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

const departure = localFont({
  src: '../../public/font/DepartureMono-Regular.woff2',
  display: 'swap',
  variable: '--font-departure',
});

export const metadata: Metadata = {
  title: "TQ DEPARTMENTS",
  description: "Created for Taqneeq",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${departure.variable}`}>
      <body>{children}</body>
    </html>
  )
}