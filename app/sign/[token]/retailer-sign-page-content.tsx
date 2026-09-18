"use client"

import Image from "next/image"
import { Languages, Check, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n/i18n-context"
import { RetailerSignPanel } from "./retailer-sign-panel"
import type { Contract } from "@/lib/types"

function RemoteSignShell({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage } = useI18n()

  return (
    <div className="flex min-h-dvh flex-col bg-[#EEF1F8]">
      <header className="bg-[#21254F]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex flex-row flex-wrap items-center gap-4">
            <div className="flex items-center">
              <Image
                src="https://eef221ebb9.imgdist.com/pub/bfra/85md611j/2vz/vdh/2hp/uslogo.png"
                alt="Universal Service Logo"
                width={160}
                height={45}
                className="h-7 w-auto object-contain sm:h-9"
                priority
              />
            </div>
            <div className="flex-none h-8 w-px bg-white/25 sm:h-10" />
            <div className="min-w-0 text-[10px] text-white/90 sm:text-sm">
              <p className="font-semibold text-white">Universal Service 2006 SRL</p>
              <p className="truncate">{t("retailerNetwork")}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white gap-2">
                <Languages className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{language}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={() => setLanguage("en")}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">🇬🇧</span> English
                </span>
                {language === "en" && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={() => setLanguage("it")}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">🇮🇹</span> Italiano
                </span>
                {language === "it" && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">{children}</main>

      <footer className="bg-[#21254F]">
        <div className="mx-auto w-full max-w-2xl px-6 py-4 text-[10px] leading-relaxed text-white/60 sm:text-xs">
          <p className="font-medium text-white/80">Universal Service 2006 S.R.L</p>
          <p>Via Genzano 195, 00179 Roma, Italia</p>
          <p>Tel: 0689971909 · Fax: 06765455 · Email: hotspot.it@lycamobile.com</p>
          <p className="mt-2 pt-2 border-t border-white/10 italic">
            © {new Date().getFullYear()} {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  )
}

interface RetailerSignPageContentProps {
  token: string
  contract: Pick<
    Contract,
    | "id"
    | "company_name"
    | "shop_name"
    | "vat_number"
    | "contact_first_name"
    | "contact_last_name"
    | "street"
    | "house_number"
    | "city"
    | "post_code"
    | "email"
    | "mobile_number"
    | "landline_number"
    | "status"
    | "retailer_signature_path"
    | "retailer_ack"
    | "retailer_gdpr"
    | "otp_verified_at"
    | "sign_link_expires_at"
    | "sign_link_used_at"
  > | null
  error?: string
}

export function RetailerSignPageContent({ token, contract, error }: RetailerSignPageContentProps) {
  const { t } = useI18n()

  if (error || !contract) {
    return (
      <RemoteSignShell>
        <Card>
          <CardHeader>
            <CardTitle>{error ? t("serviceUnavailableTitle") : t("invalidLinkTitle")}</CardTitle>
          </CardHeader>
          <CardContent>{error || t("invalidLinkDesc")}</CardContent>
        </Card>
      </RemoteSignShell>
    )
  }

  return (
    <RemoteSignShell>
      <div className="flex flex-col gap-6">
        <RetailerSignPanel
          token={token}
          initial={{
            contractId: contract.id,
            companyName: contract.company_name,
            shopName: contract.shop_name,
            vatNumber: contract.vat_number,
            contactFirstName: contract.contact_first_name,
            contactLastName: contract.contact_last_name,
            street: contract.street,
            houseNumber: contract.house_number,
            city: contract.city,
            postCode: contract.post_code,
            email: contract.email,
            mobileNumber: contract.mobile_number,
            landlineNumber: contract.landline_number,
            status: contract.status,
            retailerSignaturePath: contract.retailer_signature_path,
            retailerAck: contract.retailer_ack ?? null,
            retailerGdpr: contract.retailer_gdpr ?? null,
            otpVerifiedAt: contract.otp_verified_at,
            signLinkExpiresAt: contract.sign_link_expires_at,
            signLinkUsedAt: contract.sign_link_used_at,
          }}
        />
      </div>
    </RemoteSignShell>
  )
}
