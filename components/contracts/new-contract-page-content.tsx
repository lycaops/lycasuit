"use client"

import { NewContractForm } from "@/components/contracts/new-contract-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/i18n-context"
import type { AppUser } from "@/lib/types"

export function NewContractPageContent({ user }: { user: AppUser }) {
  const { t } = useI18n()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("newContractTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("newContractDesc")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("retailerDetails")}</CardTitle>
          <CardDescription>
            {t("requiredFieldsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewContractForm currentUser={user} />
        </CardContent>
      </Card>
    </div>
  )
}
