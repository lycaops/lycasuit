import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { InstallButton } from "@/components/pwa/install-button"
import { PwaRegister } from "@/components/pwa/pwa-register"
import { I18nProvider } from "@/lib/i18n/i18n-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans-family", display: "swap" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-family", display: "swap" })

export const metadata: Metadata = {
  title: "LycaOps",
  description:
    "Field IQ, Retailer Contracts, Incentive Statements and Market Assistance for Lycamobile Italy, behind a single login.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "LycaOps",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#152253",
  viewportFit: "cover",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} bg-background`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <I18nProvider>
          {children}
          <PwaRegister />
          <InstallButton />
          <Toaster richColors position="top-right" />
          {process.env.NODE_ENV === "production" && <Analytics />}
        </I18nProvider>
      </body>
    </html>
  )
}
