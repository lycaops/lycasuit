"use server"

import { revalidatePath } from "next/cache"
import { readFile } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { buildContractPdf } from "@/lib/pdf/build-pdf"
import type { ContractFields } from "@/lib/pdf/contract-text"
import type { Contract } from "@/lib/types"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export interface NewContractInput {
  company_name: string
  vat_number: string
  contact_first_name: string
  contact_last_name: string
  shop_name: string
  street: string
  house_number: string
  city: string
  post_code: string
  landline_number?: string | null
  mobile_number: string
  email: string
  branch?: string | null
  zone?: string | null
}

export async function createContractAction(
  input: NewContractInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    const branch =
      input.branch ?? user.branch ?? (user.role === "RSM" ? (user.branches?.[0] ?? null) : null)
    const zone = input.zone ?? user.zone

    const { data, error } = await supabase
      .from("contracts")
      .insert({
        ...input,
        branch,
        zone,
        created_by: user.id,
        status: "GENERATED",
      })
      .select("id")
      .single()

    if (error) return { ok: false, error: error.message }

    revalidatePath("/tools/contracts")
    revalidatePath("/tools/contracts/contracts")
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateContractAction(
  input: { id: string } & NewContractInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: existingRow, error: existingErr } = await supabase
      .from("contracts")
      .select("id, status, branch, zone")
      .eq("id", input.id)
      .single()
    if (existingErr || !existingRow) {
      return { ok: false, error: existingErr?.message || "Contract not found" }
    }
    const existing = existingRow as Pick<Contract, "id" | "status" | "branch" | "zone">
    if (existing.status === "SIGNED") {
      return { ok: false, error: "Signed contracts cannot be edited." }
    }

    const nextBranch =
      user.role === "ADMIN" || user.role === "RSM"
        ? (input.branch ?? existing.branch)
        : existing.branch
    const nextZone =
      user.role === "ADMIN" || user.role === "ASM" || user.role === "RSM"
        ? (input.zone ?? existing.zone)
        : existing.zone

    const { error: updErr } = await supabase
      .from("contracts")
      .update({
        company_name: input.company_name,
        vat_number: input.vat_number,
        contact_first_name: input.contact_first_name,
        contact_last_name: input.contact_last_name,
        shop_name: input.shop_name,
        street: input.street,
        house_number: input.house_number,
        city: input.city,
        post_code: input.post_code,
        landline_number: input.landline_number ?? null,
        mobile_number: input.mobile_number,
        email: input.email,
        branch: nextBranch ?? null,
        zone: nextZone ?? null,
        status: "GENERATED",
        retailer_signature_path: null,
        retailer_ack: null,
        retailer_gdpr: null,
        retailer_signed_at: null,
        retailer_sign_ip: null,
        retailer_sign_user_agent: null,
        staff_signature_path: null,
        pdf_path: null,
        signed_at: null,
        emailed_at: null,
        otp_hash: null,
        otp_salt: null,
        otp_sent_at: null,
        otp_expires_at: null,
        otp_verified_at: null,
        otp_attempts: 0,
        otp_verify_ip: null,
        otp_verify_user_agent: null,
        sign_link_hash: null,
        sign_link_sent_at: null,
        sign_link_expires_at: null,
        sign_link_used_at: null,
      })
      .eq("id", input.id)

    if (updErr) return { ok: false, error: updErr.message }

    revalidatePath("/tools/contracts")
    revalidatePath("/tools/contracts/contracts")
    revalidatePath(`/tools/contracts/contracts/${input.id}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function deleteContractAction(
  id: string,
): Promise<ActionResult> {
  try {
    await requireUser()
    const supabase = await createClient()
    const { error } = await supabase.from("contracts").delete().eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/tools/contracts")
    revalidatePath("/tools/contracts/contracts")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Upload a signature dataURL to Supabase Storage.
 * Accepts "data:image/png;base64,...." and returns the storage path.
 */
async function uploadSignature(
  contractId: string,
  who: "retailer" | "staff",
  dataUrl: string,
) {
  const supabase = await createClient()
  const base64 = dataUrl.split(",")[1] ?? ""
  const bytes = Buffer.from(base64, "base64")

  const filePath = `${contractId}/${who}-${Date.now()}.png`
  const { error } = await supabase.storage
    .from("signatures")
    .upload(filePath, bytes, {
      contentType: "image/png",
      upsert: true,
    })
  if (error) throw new Error(error.message)
  return filePath
}

async function downloadFromStorage(
  bucket: string,
  filePath: string,
): Promise<Uint8Array> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(bucket).download(filePath)
  if (error || !data) throw new Error(error?.message || "Failed to download")
  return new Uint8Array(await data.arrayBuffer())
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function getBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000"
  return raw.replace(/\/+$/, "")
}

export async function getContractSigningStateAction(id: string): Promise<
  ActionResult<{
    retailerSignaturePath: string | null
    retailerAck: boolean | null
    retailerGdpr: boolean | null
    retailerSignedAt: string | null
    otpVerifiedAt: string | null
    signLinkSentAt: string | null
    signLinkExpiresAt: string | null
    signLinkUsedAt: string | null
    email: string | null
  }>
> {
  try {
    await requireUser()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("contracts")
      .select(
        "retailer_signature_path, retailer_ack, retailer_gdpr, retailer_signed_at, otp_verified_at, sign_link_sent_at, sign_link_expires_at, sign_link_used_at, email",
      )
      .eq("id", id)
      .single()

    if (error || !data) return { ok: false, error: error?.message || "Contract not found" }
    const row = data as Pick<
      Contract,
      | "retailer_signature_path"
      | "retailer_ack"
      | "retailer_gdpr"
      | "retailer_signed_at"
      | "otp_verified_at"
      | "sign_link_sent_at"
      | "sign_link_expires_at"
      | "sign_link_used_at"
      | "email"
    >
    return {
      ok: true,
      data: {
        retailerSignaturePath: row.retailer_signature_path ?? null,
        retailerAck: row.retailer_ack ?? null,
        retailerGdpr: row.retailer_gdpr ?? null,
        retailerSignedAt: row.retailer_signed_at ?? null,
        otpVerifiedAt: row.otp_verified_at ?? null,
        signLinkSentAt: row.sign_link_sent_at ?? null,
        signLinkExpiresAt: row.sign_link_expires_at ?? null,
        signLinkUsedAt: row.sign_link_used_at ?? null,
        email: row.email ?? null,
      },
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function saveRetailerSignatureAction(input: {
  id: string
  retailerSignature: string
  ack: boolean
  gdpr: boolean
}): Promise<ActionResult<{ retailerSignaturePath: string }>> {
  try {
    await requireUser()
    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    const { data: existingRow, error: existingErr } = await supabase
      .from("contracts")
      .select("id, status")
      .eq("id", input.id)
      .single()
    if (existingErr || !existingRow) {
      return { ok: false, error: existingErr?.message || "Contract not found" }
    }
    const existing = existingRow as Pick<Contract, "id" | "status">
    if (existing.status === "SIGNED") {
      return { ok: false, error: "This contract is already signed." }
    }

    const retailerSignaturePath = await uploadSignature(
      input.id,
      "retailer",
      input.retailerSignature,
    )

    const { error: updErr } = await supabase
      .from("contracts")
      .update({
        retailer_signature_path: retailerSignaturePath,
        retailer_ack: input.ack,
        retailer_gdpr: input.gdpr,
        retailer_signed_at: nowIso,
        otp_verified_at: null,
        status: "PENDING",
      })
      .eq("id", input.id)
    if (updErr) return { ok: false, error: updErr.message }

    revalidatePath("/tools/contracts")
    revalidatePath("/tools/contracts/contracts")
    revalidatePath(`/tools/contracts/contracts/${input.id}`)

    return { ok: true, data: { retailerSignaturePath } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

async function buildRetailerSigningLinkEmailHtml(input: {
  retailerName: string
  shopName: string
  zone: string
  contractCode: string
  issueDate: string
  signDeadline: string
  pdfFilename: string
  pdfSize: string
  pdfPages: string
  signUrl: string
  draftDownloadUrl: string
}) {
  try {
    const templatePath = path.join(process.cwd(), "public", "remotesign.html")
    const raw = await readFile(templatePath, "utf8")

    return raw
      .replaceAll("[Nome Retailer]", escapeHtml(input.retailerName || "Retailer"))
      .replaceAll("[Nome Negozio]", escapeHtml(input.shopName || ""))
      .replaceAll("[Zona / Agente]", escapeHtml(input.zone || "—"))
      .replaceAll("[CONTRACT_CODE]", escapeHtml(input.contractCode || ""))
      .replaceAll("[ISSUE_DATE]", escapeHtml(input.issueDate || ""))
      .replaceAll("[SIGN_DEADLINE]", escapeHtml(input.signDeadline || ""))
      .replaceAll("[PDF_FILENAME]", escapeHtml(input.pdfFilename || ""))
      .replaceAll("[PDF_SIZE]", escapeHtml(input.pdfSize || ""))
      .replaceAll("[PDF_PAGES]", escapeHtml(input.pdfPages || ""))
      .replaceAll("[SIGN_URL]", escapeHtml(input.signUrl || ""))
      .replaceAll("[DOWNLOAD_URL]", escapeHtml(input.draftDownloadUrl || ""))
  } catch {
    const safeName = escapeHtml(input.retailerName || "Retailer")
    const safeSignUrl = escapeHtml(input.signUrl || "")
    const safeDraftUrl = escapeHtml(input.draftDownloadUrl || "")
    return [
      `<p>Gentile <strong>${safeName}</strong>,</p>`,
      `<p>Per firmare il contratto, apri questo link dal tuo dispositivo:</p>`,
      `<p><a href="${safeSignUrl}" target="_blank" rel="noreferrer">${safeSignUrl}</a></p>`,
      `<p>Bozza contratto (PDF): <a href="${safeDraftUrl}" target="_blank" rel="noreferrer">${safeDraftUrl}</a></p>`,
      `<p>Universal Service 2006 S.R.L</p>`,
    ].join("")
  }
}

export async function sendRetailerSigningLinkAction(
  id: string,
): Promise<
  ActionResult<{
    url: string
    emailed: boolean
    sentTo: string | null
    expiresAt: string
  }>
> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()
    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract
    if (contract.status === "SIGNED") {
      return { ok: false, error: "This contract is already signed." }
    }
    if (!contract.email) {
      return { ok: false, error: "Retailer email is missing." }
    }
    if (contract.retailer_signature_path && contract.otp_verified_at) {
      return { ok: false, error: "Retailer signing is already completed." }
    }

    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = sha256Hex(token)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000)
    const url = `${getBaseUrl()}/sign/${token}`

    const { error: updErr } = await supabase
      .from("contracts")
      .update({
        sign_link_hash: tokenHash,
        sign_link_sent_at: now.toISOString(),
        sign_link_expires_at: expiresAt.toISOString(),
        sign_link_used_at: null,
        retailer_signature_path: null,
        retailer_ack: null,
        retailer_gdpr: null,
        retailer_signed_at: null,
        retailer_sign_ip: null,
        retailer_sign_user_agent: null,
        otp_hash: null,
        otp_salt: null,
        otp_sent_at: null,
        otp_expires_at: null,
        otp_verified_at: null,
        otp_attempts: 0,
        otp_verify_ip: null,
        otp_verify_user_agent: null,
        status: "PENDING",
      })
      .eq("id", id)
    if (updErr) return { ok: false, error: updErr.message }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return {
        ok: true,
        data: { url, emailed: false, sentTo: null, expiresAt: expiresAt.toISOString() },
      }
    }

    const retailerName = `${contract.contact_first_name ?? ""} ${contract.contact_last_name ?? ""}`.trim()
    const retailerCode = (contract.id ?? "").split("-")[0]?.toUpperCase() ?? ""
    const contractCode = retailerCode || (contract.id ?? "")

    const issueDate = now.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const signDeadline = expiresAt.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    let draftDownloadUrl = url
    let pdfFilename = "Contratto_Affiliazione_Retailer_Bozza.pdf"
    let pdfSize = "—"
    let pdfPages = "7 pagine"

    try {
      const { pdfBytes } = await buildDraftContractPdf(contract, user.full_name)
      const safeRetailerCode = (retailerCode || "CONTRATTO").replace(/[^A-Za-z0-9_-]/g, "-")
      pdfFilename = `Contratto_Affiliazione_BOZZA_${safeRetailerCode}.pdf`
      pdfSize = `${Math.max(1, Math.round(pdfBytes.length / 1024))} KB`

      const pdfPath = `${id}/draft-signlink-${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(pdfPath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        })
      if (!upErr) {
        const { data: urlData, error: urlErr } = await supabase.storage
          .from("contracts")
          .createSignedUrl(pdfPath, 60 * 60 * 24 * 7, { download: true })
        if (!urlErr && urlData?.signedUrl) {
          draftDownloadUrl = urlData.signedUrl
        }
      }
    } catch {}

    const html = await buildRetailerSigningLinkEmailHtml({
      retailerName,
      shopName: contract.shop_name ?? "",
      zone: contract.zone ?? "—",
      contractCode,
      issueDate,
      signDeadline,
      pdfFilename,
      pdfSize,
      pdfPages,
      signUrl: url,
      draftDownloadUrl,
    })

    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [contract.email],
        subject: "Link per la firma del contratto",
        html,
        text: `Gentile ${contract.contact_first_name},\n\nPer firmare il contratto apri questo link:\n${url}\n\nBozza contratto (PDF):\n${draftDownloadUrl}\n\nIl link scade il ${expiresAt.toLocaleString("it-IT")}.\n\nUniversal Service 2006 S.R.L`,
      }),
    })

    if (!res.ok) {
      return {
        ok: true,
        data: { url, emailed: false, sentTo: null, expiresAt: expiresAt.toISOString() },
      }
    }

    return {
      ok: true,
      data: { url, emailed: true, sentTo: contract.email, expiresAt: expiresAt.toISOString() },
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Persist retailer + staff signatures, render the final PDF and upload it.
 * Marks the contract as SIGNED.
 */
export async function finalizeContractAction(input: {
  id: string
  staffSignature: string // dataURL
  retailerSignature?: string | null // dataURL
}): Promise<ActionResult<{ pdfPath: string }>> {
  try {
    const staffUser = await requireUser()
    const supabase = await createClient()
    const signedAtIso = new Date().toISOString()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", input.id)
      .single()

    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract
    if (!contract.otp_verified_at) {
      return { ok: false, error: "OTP verification is required before finalizing." }
    }
    if (!input.retailerSignature && !contract.retailer_signature_path) {
      return { ok: false, error: "Retailer signature is required before finalizing." }
    }

    // 1. Upload signatures
    const retailerPath = input.retailerSignature
      ? await uploadSignature(input.id, "retailer", input.retailerSignature)
      : (contract.retailer_signature_path as string)
    const staffPath = await uploadSignature(
      input.id,
      "staff",
      input.staffSignature,
    )

    // 2. Build PDF
    const retailerPng = input.retailerSignature
      ? Buffer.from(input.retailerSignature.split(",")[1] ?? "", "base64")
      : Buffer.from(await downloadFromStorage("signatures", retailerPath))
    const staffPng = Buffer.from(input.staffSignature.split(",")[1] ?? "", "base64")

    const loadPng = async (name: string): Promise<Uint8Array | null> => {
      try {
        const buf = await readFile(path.join(process.cwd(), "public", name))
        return new Uint8Array(buf)
      } catch {
        return null
      }
    }
    const [usLogoBytes, lycaLogoBytes] = await Promise.all([
      loadPng("uslogo.png"),
      loadPng("lyca-logo.png"),
    ])

    const fullName = `${contract.contact_first_name} ${contract.contact_last_name}`.trim()
    const fields: ContractFields = {
      companyName: contract.company_name,
      vatNumber: contract.vat_number,
      address: `${contract.street}, ${contract.house_number}, ${contract.post_code} ${contract.city}`,
      mobileNumber: contract.mobile_number,
      landlineNumber: contract.landline_number ?? "",
      contactPerson: fullName,
      surname: contract.contact_last_name,
      firstName: contract.contact_first_name,
      shopName: contract.shop_name,
      shopAddress: `${contract.street} ${contract.house_number}, ${contract.post_code} ${contract.city}`,
      street: contract.street,
      houseNumber: contract.house_number,
      city: contract.city,
      postCode: contract.post_code,
      email: contract.email,
      date: new Date(signedAtIso).toLocaleDateString("it-IT"),
    }

    const pdfBytes = await buildContractPdf({
      fields,
      retailerSignaturePng: new Uint8Array(retailerPng),
      staffSignaturePng: new Uint8Array(staffPng),
      usLogoPng: usLogoBytes,
      lycaLogoPng: lycaLogoBytes,
      staffSignerName: staffUser.full_name,
      contractId: input.id,
      staffSignedAtIso: signedAtIso,
      otpProof: {
        retailerName: fullName,
        email: contract.email,
        verifiedAtIso: contract.otp_verified_at,
        verifyIp: contract.otp_verify_ip ?? null,
      },
    })

    const pdfPath = `${input.id}/contract-${Date.now()}.pdf`
    const { error: pdfErr } = await supabase.storage
      .from("contracts")
      .upload(pdfPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      })
    if (pdfErr) return { ok: false, error: pdfErr.message }

    // 3. Update contract
    const { error: updateErr } = await supabase
      .from("contracts")
      .update({
        retailer_signature_path: retailerPath,
        staff_signature_path: staffPath,
        pdf_path: pdfPath,
        status: "SIGNED",
        signed_at: signedAtIso,
      })
      .eq("id", input.id)

    if (updateErr) return { ok: false, error: updateErr.message }

    revalidatePath("/tools/contracts")
    revalidatePath("/tools/contracts/contracts")
    revalidatePath(`/tools/contracts/contracts/${input.id}`)

    return { ok: true, data: { pdfPath } }
  } catch (e) {
    console.error("Finalize Error:", e)
    return { 
      ok: false, 
      error: e instanceof Error ? e.message : "An unexpected error occurred during finalization" 
    }
  }
}

function hashOtp(otp: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${otp}`).digest("hex")
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderOtpDigitsHtml(otp: string) {
  const digits = otp.replaceAll(/\D/g, "").slice(0, 6).padStart(6, "0").split("")
  const cells = digits.map((d, i) => {
    if (i === 3) return `<td class="otp-sep-cell">·</td><td class="otp-cell">${d}</td>`
    return `<td class="otp-cell">${d}</td>`
  })

  return `<table role="presentation" class="otp-table" cellspacing="0" cellpadding="0" border="0" align="center"><tr>${cells.join("")}</tr></table>`
}

async function buildContractOtpEmailHtml(input: {
  contactFirstName: string
  otp: string
}) {
  try {
    const templatePath = path.join(
      process.cwd(),
      "public",
      "verifica OTP per la firma del contratto.html",
    )
    const raw = await readFile(templatePath, "utf8")

    const safeName = escapeHtml(input.contactFirstName || "Retailer")
    const safeOtp = input.otp.replaceAll(/\D/g, "").slice(0, 6).padStart(6, "0")

    const withName = raw.replaceAll("[Nome Retailer]", safeName)
    const withDigits = withName.replaceAll(
      "[OTP_DIGITS]",
      renderOtpDigitsHtml(safeOtp),
    )

    return withDigits
  } catch {
    const safeName = escapeHtml(input.contactFirstName || "Retailer")
    const safeOtp = input.otp.replaceAll(/\D/g, "").slice(0, 6).padStart(6, "0")
    return `<p>Gentile ${safeName},</p><p>Il tuo codice OTP è: <strong>${safeOtp}</strong></p><p>Il codice scade tra 10 minuti.</p>`
  }
}

export async function requestContractOtpAction(
  id: string,
): Promise<ActionResult<{ sentTo: string }>> {
  try {
    await requireUser()
    const supabase = await createClient()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()
    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract
    if (!contract.email) {
      return { ok: false, error: "Retailer email is missing." }
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return {
        ok: false,
        error: "Email is not configured. Set RESEND_API_KEY to enable OTP sending.",
      }
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")
    const salt = crypto.randomBytes(16).toString("hex")
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)

    const { error: updErr } = await supabase
      .from("contracts")
      .update({
        otp_hash: hashOtp(otp, salt),
        otp_salt: salt,
        otp_sent_at: now.toISOString(),
        otp_expires_at: expiresAt.toISOString(),
        otp_verified_at: null,
        otp_attempts: 0,
      })
      .eq("id", id)
    if (updErr) return { ok: false, error: updErr.message }

    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
    const html = await buildContractOtpEmailHtml({
      contactFirstName: contract.contact_first_name ?? "",
      otp,
    })
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [contract.email],
        subject: "Codice di verifica OTP per la firma del contratto",
        html,
        text: `Gentile ${contract.contact_first_name},\n\nIl tuo codice OTP è: ${otp}\n\nIl codice scade tra 10 minuti.\n\nGrazie,\nUniversal Service 2006 S.R.L`,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `OTP email failed: ${body}` }
    }

    return { ok: true, data: { sentTo: contract.email } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function verifyContractOtpAction(input: {
  id: string
  otp: string
}): Promise<ActionResult<{ verifiedAt: string }>> {
  try {
    await requireUser()
    const supabase = await createClient()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", input.id)
      .single()
    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract

    const otpHash = contract.otp_hash ?? null
    const otpSalt = contract.otp_salt ?? null
    const otpExpiresAt = contract.otp_expires_at ?? null
    const attempts = contract.otp_attempts ?? 0

    if (!otpHash || !otpSalt || !otpExpiresAt) {
      return { ok: false, error: "OTP is not requested yet." }
    }
    if (attempts >= 5) {
      return { ok: false, error: "Too many attempts. Request a new OTP." }
    }

    const expires = new Date(otpExpiresAt).getTime()
    if (Number.isNaN(expires) || Date.now() > expires) {
      return { ok: false, error: "OTP expired. Request a new OTP." }
    }

    const code = input.otp.replace(/\s+/g, "")
    if (!/^\d{6}$/.test(code)) {
      return { ok: false, error: "OTP must be 6 digits." }
    }

    const ok = hashOtp(code, otpSalt) === otpHash
    if (!ok) {
      const { error: incErr } = await supabase
        .from("contracts")
        .update({ otp_attempts: attempts + 1 })
        .eq("id", input.id)
      if (incErr) return { ok: false, error: incErr.message }
      return { ok: false, error: "Invalid OTP." }
    }

    const verifiedAt = new Date().toISOString()
    const { error: verErr } = await supabase
      .from("contracts")
      .update({ otp_verified_at: verifiedAt })
      .eq("id", input.id)
    if (verErr) return { ok: false, error: verErr.message }

    return { ok: true, data: { verifiedAt } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Create a short-lived signed URL to view / download a contract PDF.
 */
export async function getContractPdfUrlAction(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    await requireUser()
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from("contracts")
      .select("pdf_path")
      .eq("id", id)
      .single()
    if (error || !row?.pdf_path) {
      return { ok: false, error: "PDF not available" }
    }
    const { data, error: urlErr } = await supabase.storage
      .from("contracts")
      .createSignedUrl(row.pdf_path, 60 * 60, {
        download: true,
      })
    if (urlErr || !data) {
      return { ok: false, error: urlErr?.message || "Could not create URL" }
    }
    return { ok: true, data: { url: data.signedUrl } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Send the signed PDF to retailer + staff email.
 * Uses Resend if RESEND_API_KEY is configured; otherwise returns a message
 * indicating the admin should configure it.
 */
export async function sendContractEmailAction(
  id: string,
): Promise<ActionResult<{ sentTo: string[] }>> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()
    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract
    if (!contract.pdf_path) {
      return { ok: false, error: "Sign the contract before emailing." }
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return {
        ok: false,
        error:
          "Email is not configured. Set RESEND_API_KEY in your environment to enable sending.",
      }
    }

    const escapeHtml = (input: string) =>
      input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")

    const formatDate = (iso: string) => {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ""
      return d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }

    const retailerName = `${contract.contact_first_name ?? ""} ${contract.contact_last_name ?? ""}`.trim()
    const retailerCode = (contract.id ?? "").split("-")[0]?.toUpperCase() ?? ""
    const signDate = contract.signed_at
      ? formatDate(contract.signed_at)
      : new Date().toLocaleDateString("it-IT")

    let html: string | undefined
    try {
      const templatePath = path.join(
        process.cwd(),
        "public",
        "Contratto di Affiliazione.html",
      )
      const raw = await readFile(templatePath, "utf8")
      html = raw
        .replaceAll("{{{RETAILER_NAME}}}", escapeHtml(retailerName || ""))
        .replaceAll("{{{COMPANY_NAME}}}", escapeHtml(contract.company_name || ""))
        .replaceAll("{{{RETAILER_CODE}}}", escapeHtml(retailerCode || ""))
        .replaceAll("{{{SIGN_DATE}}}", escapeHtml(signDate || ""))
        .replaceAll(
          "{{{CONTRACT_TYPE}}}",
          escapeHtml("Contratto di Affiliazione"),
        )
        .replaceAll("{{{VAT_NUMBER}}}", escapeHtml(contract.vat_number || ""))
    } catch {
      html = undefined
    }

    // Download PDF bytes
    const pdfBytes = await downloadFromStorage("contracts", contract.pdf_path)
    const base64 = Buffer.from(pdfBytes).toString("base64")

    const recipients = [contract.email, user.email].filter(Boolean)
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
    const safeRetailerCode = (retailerCode || "CONTRATTO").replace(
      /[^A-Za-z0-9_-]/g,
      "-",
    )

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `Contratto firmato — ${contract.company_name}`,
        ...(html ? { html } : {}),
        text: `Gentile ${contract.contact_first_name},\n\nin allegato trovate il contratto firmato relativo al punto vendita "${contract.shop_name}".\n\nGrazie,\nUniversal Service 2006 S.R.L`,
        attachments: [
          {
            filename: `Contratto_Affiliazione_${safeRetailerCode}.pdf`,
            content: base64,
          },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Email failed: ${body}` }
    }

    await supabase
      .from("contracts")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", id)

    revalidatePath(`/tools/contracts/contracts/${id}`)
    return { ok: true, data: { sentTo: recipients } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function buildDraftContractPdf(contract: Contract, staffSignerName: string) {
  const loadPng = async (name: string): Promise<Uint8Array | null> => {
    try {
      const buf = await readFile(path.join(process.cwd(), "public", name))
      return new Uint8Array(buf)
    } catch {
      return null
    }
  }
  const [usLogoBytes, lycaLogoBytes] = await Promise.all([
    loadPng("uslogo.png"),
    loadPng("lyca-logo.png"),
  ])

  const fullName = `${contract.contact_first_name} ${contract.contact_last_name}`.trim()
  const fields: ContractFields = {
    companyName: contract.company_name,
    vatNumber: contract.vat_number,
    address: `${contract.street}, ${contract.house_number}, ${contract.post_code} ${contract.city}`,
    mobileNumber: contract.mobile_number,
    landlineNumber: contract.landline_number ?? "",
    contactPerson: fullName,
    surname: contract.contact_last_name,
    firstName: contract.contact_first_name,
    shopName: contract.shop_name,
    shopAddress: `${contract.street} ${contract.house_number}, ${contract.post_code} ${contract.city}`,
    street: contract.street,
    houseNumber: contract.house_number,
    city: contract.city,
    postCode: contract.post_code,
    email: contract.email,
    date: new Date().toLocaleDateString("it-IT"),
  }

  const pdfBytes = await buildContractPdf({
    fields,
    retailerSignaturePng: null,
    staffSignaturePng: null,
    usLogoPng: usLogoBytes,
    lycaLogoPng: lycaLogoBytes,
    staffSignerName,
  })

  const filename = `${contract.shop_name} (Unsigned).pdf`
  return { pdfBytes, filename }
}

const DRAFT_CONTRACT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Bozza Contratto — Lycamobile Retailer</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; display: block; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { text-decoration: none; }
    .ReadMsgBody, .ExternalClass { width: 100%; }
    .ExternalClass * { line-height: 100%; }
    body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; background-color: #EEF1F8; margin: 0; padding: 0; }

    @media only screen and (max-width: 560px) {
      .email-wrapper { width: 100% !important; padding: 20px 8px !important; }
      .outer-card { width: 100% !important; }
      .header-td { padding: 20px !important; }
      .header-badge { display: none !important; font-size: 0 !important; max-height: 0 !important; overflow: hidden !important; }
      .body-td { padding: 24px 20px 20px !important; }
      .footer-td { padding: 16px 20px !important; }
      .step-icon-td { display: none !important; }
      .cta-btn { width: 100% !important; }
      .doc-preview-td { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#EEF1F8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;" width="100%">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#EEF1F8;line-height:1px;">
  La bozza del tuo contratto di affiliazione Lycamobile è pronta. Revisionala, firmala digitalmente e completa la verifica OTP.&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#EEF1F8;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
        <tr>
          <td align="center" style="padding-bottom:14px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;color:#8A95A8;letter-spacing:0.02em;">
            Bozza contratto di affiliazione Lycamobile Retailer — Azione richiesta
          </td>
        </tr>
      </table>

      <!--[if mso]>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center">
      <tr><td>
      <![endif]-->
      <table class="outer-card" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;border:1px solid #DDE3EF;border-collapse:separate;overflow:hidden;">

        <tr>
          <td style="padding:0;border-radius:16px 16px 0 0;overflow:hidden;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#21264E;">
              <tr>
                <td class="header-td" style="padding:26px 36px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td valign="middle" style="width:auto;">
                        <img
                          src="https://eef221ebb9.imgdist.com/pub/bfra/85md611j/2vz/vdh/2hp/uslogo.png"
                          alt="Universal Service Logo"
                          width="60" height="36"
                          style="display:inline-block;border:0;height:36px;width:auto;max-width:60px;-ms-interpolation-mode:bicubic;"
                        />
                      </td>
                      <td valign="middle" style="width:1px;padding:0 14px;">
                        <div style="width:1px;height:36px;background-color:rgba(255,255,255,0.18);font-size:0;line-height:0;">&#8203;</div>
                      </td>
                      <td valign="middle">
                        <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.01em;line-height:1.3;mso-line-height-rule:exactly;">Universal Service 2006 SRL</p>
                        <p style="margin:3px 0 0 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;font-weight:400;color:#5B9DEF;letter-spacing:0.02em;line-height:1.3;mso-line-height-rule:exactly;">Rete Retailer Lycamobile &mdash; Contrattualistica</p>
                      </td>
                      <td valign="middle" align="right" class="header-badge">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:4px 12px;background-color:#1a3a6e;border:1px solid #5B9DEF;border-radius:20px;border-collapse:separate;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;color:#93C2F7;letter-spacing:0.06em;white-space:nowrap;text-transform:uppercase;">
                              &#128196; Bozza Contratto
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td height="4" style="font-size:0;line-height:0;height:4px;background-color:#006AE0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="body-td" style="padding:36px 36px 32px;background-color:#ffffff;">

            <p style="margin:0 0 6px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#1A202C;line-height:1.4;mso-line-height-rule:exactly;">
              Gentile <span style="color:#006AE0;">{{{RETAILER_NAME}}}</span>,
            </p>
            <p style="margin:0 0 24px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;color:#5A6578;line-height:1.8;mso-line-height-rule:exactly;">
              Il contratto di affiliazione come partner retailer <strong style="color:#21264E;">Lycamobile Italia</strong> è stato predisposto ed è pronto per la tua revisione. Ti chiediamo di <strong style="color:#1A202C;">leggere attentamente la bozza</strong>, verificare tutti i dati anagrafici e commerciali, quindi procedere con la firma digitale e la conferma via codice OTP.
            </p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;border-radius:12px;border:1px solid #C8D8F5;border-collapse:separate;overflow:hidden;">
              <tr>
                <td style="padding:14px 20px;background-color:#EBF2FF;border-bottom:1px solid #C8D8F5;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td valign="middle">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td valign="middle" style="padding-right:10px;font-size:22px;line-height:1;">&#128196;</td>
                            <td valign="middle">
                              <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#1E3A5F;line-height:1.3;mso-line-height-rule:exactly;">{{{PDF_FILENAME}}}</p>
                              <p style="margin:2px 0 0 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;color:#4A6FA5;line-height:1.3;mso-line-height-rule:exactly;">PDF &nbsp;&middot;&nbsp; {{{PDF_SIZE}}} &nbsp;&middot;&nbsp; Non firmato</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td valign="middle" align="right">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:4px 10px;background-color:#FEF3C7;border:1px solid #FCD34D;border-radius:20px;border-collapse:separate;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">
                              &#9679; Bozza
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="doc-preview-td" style="padding:18px 20px;background-color:#F8FAFF;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td valign="top" width="33%" style="padding-right:8px;padding-bottom:12px;">
                        <p style="margin:0 0 3px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#8A95A8;text-transform:uppercase;letter-spacing:0.09em;line-height:1.2;mso-line-height-rule:exactly;">Codice Contratto</p>
                        <p style="margin:0;padding:0;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;color:#1A202C;line-height:1.3;mso-line-height-rule:exactly;">{{{CONTRACT_CODE}}}</p>
                      </td>
                      <td valign="top" width="33%" style="padding-right:8px;padding-bottom:12px;">
                        <p style="margin:0 0 3px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#8A95A8;text-transform:uppercase;letter-spacing:0.09em;line-height:1.2;mso-line-height-rule:exactly;">Data Emissione</p>
                        <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#1A202C;line-height:1.3;mso-line-height-rule:exactly;">{{{ISSUE_DATE}}}</p>
                      </td>
                      <td valign="top" width="34%" style="padding-bottom:12px;">
                        <p style="margin:0 0 3px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#8A95A8;text-transform:uppercase;letter-spacing:0.09em;line-height:1.2;mso-line-height-rule:exactly;">Scadenza Firma</p>
                        <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#D93025;line-height:1.3;mso-line-height-rule:exactly;">{{{SIGN_DEADLINE}}}</p>
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" width="33%" style="padding-right:8px;">
                        <p style="margin:0 0 3px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#8A95A8;text-transform:uppercase;letter-spacing:0.09em;line-height:1.2;mso-line-height-rule:exactly;">Punto Vendita</p>
                        <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#1A202C;line-height:1.3;mso-line-height-rule:exactly;">{{{SHOP_NAME}}}</p>
                      </td>
                      <td valign="top" width="33%" style="padding-right:8px;">
                        <p style="margin:0 0 3px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#8A95A8;text-transform:uppercase;letter-spacing:0.09em;line-height:1.2;mso-line-height-rule:exactly;">Zona Commerciale</p>
                        <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#1A202C;line-height:1.3;mso-line-height-rule:exactly;">{{{ZONE}}}</p>
                      </td>
                      <td valign="top" width="34%">
                        <p style="margin:0 0 3px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#8A95A8;text-transform:uppercase;letter-spacing:0.09em;line-height:1.2;mso-line-height-rule:exactly;">Pagine</p>
                        <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#1A202C;line-height:1.3;mso-line-height-rule:exactly;">{{{PDF_PAGES}}}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;background-color:#EBF2FF;border-top:1px solid #C8D8F5;" align="center">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td align="center" style="border-radius:8px;border-collapse:separate;background-color:#006AE0;">
                        <a href="{{{DOWNLOAD_URL}}}" target="_blank" style="display:inline-block;padding:10px 28px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:10px 28px;letter-spacing:0.01em;">
                          &#8675;&nbsp; Scarica la Bozza PDF
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:8px 0 0 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;color:#4A6FA5;line-height:1.4;mso-line-height-rule:exactly;">Il link è valido per 7 giorni dalla data di emissione</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;color:#5A6578;line-height:1.7;mso-line-height-rule:exactly;">
              Per assistenza contatta il tuo referente commerciale Lycamobile o scrivi a&nbsp;<a href="mailto:retailersupport@lycamobile.it" style="color:#006AE0;text-decoration:none;font-weight:600;">retailersupport@lycamobile.it</a>
            </p>

          </td>
        </tr>

        <tr>
          <td class="footer-td" style="padding:20px 36px;background-color:#F4F7FF;border-top:1px solid #DDE3EF;border-radius:0 0 16px 16px;">

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
              <tr>
                <td valign="middle">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="middle" style="padding-right:6px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="8" height="8" style="width:8px;height:8px;background-color:#22C55E;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td>
                          </tr>
                        </table>
                      </td>
                      <td valign="middle" style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;color:#6B7A94;letter-spacing:0.03em;">
                        Authorised Lycamobile Distributor
                      </td>
                    </tr>
                  </table>
                  <p style="margin:5px 0 0 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;font-style:italic;color:#9AA5B8;line-height:1.4;mso-line-height-rule:exactly;">
                    Email automatica &mdash; non rispondere a questo messaggio
                  </p>
                </td>
                <td valign="middle" align="right">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 10px;background-color:#EBF2FF;border:1px solid #C8D8F5;border-radius:6px;border-collapse:separate;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;color:#1E3A5F;white-space:nowrap;">
                        Rif: {{{CONTRACT_CODE}}}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
              <tr>
                <td height="1" style="font-size:0;line-height:0;height:1px;background-color:#DDE3EF;">&nbsp;</td>
              </tr>
            </table>

            <p style="margin:0 0 2px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;color:#9AA5B8;line-height:1.5;mso-line-height-rule:exactly;">Universal Service 2006 S.R.L &nbsp;&middot;&nbsp; Via Genzano 195, 00179 Roma</p>
            <p style="margin:0 0 2px 0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;color:#9AA5B8;line-height:1.5;mso-line-height-rule:exactly;">P.IVA: IT 09037721009 &nbsp;&middot;&nbsp; Distributore autorizzato Lycamobile Italia</p>
            <p style="margin:0;padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;color:#9AA5B8;line-height:1.5;mso-line-height-rule:exactly;">&copy; 2025 Universal Service 2006 SRL. Tutti i diritti riservati.</p>

          </td>
        </tr>

      </table>
      <!--[if mso]>
      </td></tr>
      </table>
      <![endif]-->

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
        <tr>
          <td align="center" style="padding-top:18px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;color:#9AA5B8;letter-spacing:0.02em;">
            Ricevi questa email perch&eacute; &egrave; stato predisposto un contratto di affiliazione a tuo nome sul portale Lycamobile Retailer.
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>`

/**
 * Generate a draft PDF (no signatures) and return it as a base64 string
 * for client-side download.
 */
export async function getDraftContractPdfAction(
  id: string,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()

    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract
    const { pdfBytes, filename } = await buildDraftContractPdf(
      contract,
      user.full_name,
    )
    const base64 = Buffer.from(pdfBytes).toString("base64")

    return { ok: true, data: { base64, filename } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function getDraftContractPdfUrlAction(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()
    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract

    const { pdfBytes } = await buildDraftContractPdf(contract, user.full_name)
    const pdfPath = `${id}/draft-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage
      .from("contracts")
      .upload(pdfPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      })
    if (upErr) return { ok: false, error: upErr.message }

    const { data, error: urlErr } = await supabase.storage
      .from("contracts")
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 7, { download: true })
    if (urlErr || !data) {
      return { ok: false, error: urlErr?.message || "Could not create URL" }
    }

    return { ok: true, data: { url: data.signedUrl } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function sendDraftContractEmailAction(
  id: string,
): Promise<ActionResult<{ sentTo: string[] }>> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: contractRow, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()
    if (contractErr || !contractRow) {
      return { ok: false, error: contractErr?.message || "Contract not found" }
    }
    const contract = contractRow as Contract

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return {
        ok: false,
        error:
          "Email is not configured. Set RESEND_API_KEY in your environment to enable sending.",
      }
    }

    const escapeHtml = (input: string) =>
      input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")

    const retailerName = `${contract.contact_first_name ?? ""} ${contract.contact_last_name ?? ""}`.trim()
    const retailerCode = (contract.id ?? "").split("-")[0]?.toUpperCase() ?? ""

    const { pdfBytes } = await buildDraftContractPdf(contract, user.full_name)
    const base64 = Buffer.from(pdfBytes).toString("base64")

    const recipients = [contract.email, user.email].filter(Boolean)
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
    const safeRetailerCode = (retailerCode || "CONTRATTO").replace(
      /[^A-Za-z0-9_-]/g,
      "-",
    )

    const now = new Date()
    const issueDate = now.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const signDeadline = deadline.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    const pdfSizeKb = Math.max(1, Math.round(pdfBytes.length / 1024))
    const pdfFilename = `Contratto_Affiliazione_BOZZA_${safeRetailerCode}.pdf`

    const pdfPath = `${id}/draft-email-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage
      .from("contracts")
      .upload(pdfPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      })
    if (upErr) return { ok: false, error: upErr.message }

    const { data: urlData, error: urlErr } = await supabase.storage
      .from("contracts")
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 7, { download: true })
    if (urlErr || !urlData) {
      return { ok: false, error: urlErr?.message || "Could not create URL" }
    }

    const contractCode = retailerCode || (contract.id ?? "")

    const html = DRAFT_CONTRACT_EMAIL_TEMPLATE
      .replaceAll("{{{RETAILER_NAME}}}", escapeHtml(retailerName || ""))
      .replaceAll("{{{CONTRACT_CODE}}}", escapeHtml(contractCode || ""))
      .replaceAll("{{{ISSUE_DATE}}}", escapeHtml(issueDate))
      .replaceAll("{{{SIGN_DEADLINE}}}", escapeHtml(signDeadline))
      .replaceAll("{{{SHOP_NAME}}}", escapeHtml(contract.shop_name || ""))
      .replaceAll("{{{ZONE}}}", escapeHtml(contract.zone ?? "—"))
      .replaceAll("{{{PDF_FILENAME}}}", escapeHtml(pdfFilename))
      .replaceAll("{{{PDF_SIZE}}}", escapeHtml(`${pdfSizeKb} KB`))
      .replaceAll("{{{PDF_PAGES}}}", escapeHtml("7"))
      .replaceAll("{{{DOWNLOAD_URL}}}", escapeHtml(urlData.signedUrl))

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `Bozza contratto — ${contract.company_name}`,
        html,
        text: `Gentile ${contract.contact_first_name},\n\nin allegato trovate la bozza del contratto relativo al punto vendita "${contract.shop_name}".\n\nGrazie,\nUniversal Service 2006 S.R.L`,
        attachments: [
          {
            filename: pdfFilename,
            content: base64,
          },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Email failed: ${body}` }
    }

    revalidatePath(`/tools/contracts/contracts/${id}`)
    return { ok: true, data: { sentTo: recipients } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
