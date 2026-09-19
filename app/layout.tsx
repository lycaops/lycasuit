import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { I18nProvider } from "@/lib/i18n/i18n-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans-family", display: "swap" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-family", display: "swap" })

export const metadata: Metadata = {
  title: "LycaOps — Universal Service 2006",
  description:
    "Field IQ, Retailer Contracts, Incentive Statements and Market Assistance for Lycamobile Italy, behind a single login.",
  icons: {
    icon: "https://cms-assets.ldsvcplatform.com/IT/s3fs-public/2023-09/MicrosoftTeams-image%20%2813%29.png",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} bg-background`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <I18nProvider>
          {children}
          <Toaster richColors position="top-right" />
          {process.env.NODE_ENV === "production" && <Analytics />}
        </I18nProvider>
      </body>
    </html>
  )
}
