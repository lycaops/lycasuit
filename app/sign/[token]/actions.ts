"use server"

import crypto from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildDraftContractPdf } from "@/app/tools/contracts/contracts/actions"
import type { Contract } from "@/lib/types"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
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

async function getContractByToken(token: string) {
  const supabase = createAdminClient()
  const tokenHash = sha256Hex(token)
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("sign_link_hash", tokenHash)
    .maybeSingle()

  if (error || !data) return null
  return data as Contract
}

function isExpired(iso: string | null | undefined) {
  if (!iso) return true
  const t = new Date(iso).getTime()
  return Number.isNaN(t) || Date.now() > t
}

function extractIpCandidate(value: string | null): string | null {
  if (!value) return null
  return value.trim().replace(/^\[(.*)]$/, "$1")
}

function normalizeIp(ip: string | null): string | null {
  if (!ip) return null
  let cleaned = ip.trim()
  if (!cleaned) return null

  // Remove a port when present in IPv4 or bracketed IPv6 notation.
  const portMatch = cleaned.match(/^(.*?)(?:\:(\d+))$/)
  if (portMatch) {
    const maybeIp = portMatch[1]
    const port = portMatch[2]
    if (/^\d+$/.test(port) && maybeIp) {
      cleaned = maybeIp
    }
  }

  if (cleaned.startsWith("::ffff:")) {
    cleaned = cleaned.replace("::ffff:", "")
  }

  return cleaned || null
}

function isPrivateIp(ip: string): boolean {
  return Boolean(
    ip.match(/^127\./) ||
      ip.match(/^10\./) ||
      ip.match(/^192\.168\./) ||
      ip.match(/^169\.254\./) ||
      ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      ip === "::1" ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      ip.startsWith("fe80")
  )
}

function getFirstPublicIp(values: string[]): string | null {
  const normalized = values
    .map((value) => extractIpCandidate(value))
    .map(normalizeIp)
    .filter(Boolean) as string[]

  const publicIp = normalized.find((ip) => !isPrivateIp(ip))
  return publicIp ?? normalized[0] ?? null
}

function parseForwardedHeader(value: string | null): string | null {
  if (!value) return null
  const entries = value.split(",").map((item) => item.trim())
  for (const entry of entries) {
    const match = entry.match(/for=(?:"?\[?([^\]";]+)\]?"?)/i)
    if (match?.[1]) {
      return normalizeIp(match[1])
    }
  }
  return null
}

async function getRequestMeta() {
  const h = await headers()
  const forwardedFor = h.get("x-forwarded-for")
  const forwarded = h.get("forwarded")
  const xRealIp = h.get("x-real-ip")
  const xClientIp = h.get("x-client-ip")

  const ip =
    parseForwardedHeader(forwarded) ??
    getFirstPublicIp(forwardedFor ? forwardedFor.split(",") : []) ??
    normalizeIp(extractIpCandidate(xRealIp)) ??
    normalizeIp(extractIpCandidate(xClientIp)) ??
    null

  const userAgent = h.get("user-agent") ?? null
  return { ip, userAgent }
}

export async function saveRetailerSignatureByTokenAction(input: {
  token: string
  retailerSignature: string
  ack: boolean
  gdpr: boolean
}): Promise<ActionResult<{ retailerSignaturePath: string }>> {
  try {
    const contract = await getContractByToken(input.token)
    if (!contract) return { ok: false, error: "Invalid signing link." }
    if (contract.status === "SIGNED") return { ok: false, error: "Contract already signed." }
    if (contract.sign_link_used_at) return { ok: false, error: "Signing link already used." }
    if (isExpired(contract.sign_link_expires_at)) return { ok: false, error: "Signing link expired." }
    if (!input.ack || !input.gdpr) {
      return { ok: false, error: "Acceptance and GDPR consent are required." }
    }

    const supabase = createAdminClient()
    const base64 = input.retailerSignature.split(",")[1] ?? ""
    const bytes = Buffer.from(base64, "base64")
    const filePath = `${contract.id}/retailer-${Date.now()}.png`
    const { error: uploadErr } = await supabase.storage
      .from("signatures")
      .upload(filePath, bytes, { contentType: "image/png", upsert: true })
    if (uploadErr) return { ok: false, error: uploadErr.message }

    const nowIso = new Date().toISOString()
    const meta = await getRequestMeta()
    const { error: updErr } = await supabase
      .from("contracts")
      .update({
        retailer_signature_path: filePath,
        retailer_ack: input.ack,
        retailer_gdpr: input.gdpr,
        retailer_signed_at: nowIso,
        retailer_sign_ip: meta.ip,
        retailer_sign_user_agent: meta.userAgent,
        otp_verified_at: null,
        status: "PENDING",
      })
      .eq("id", contract.id)
    if (updErr) return { ok: false, error: updErr.message }

    return { ok: true, data: { retailerSignaturePath: filePath } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function requestContractOtpByTokenAction(
  token: string,
): Promise<ActionResult<{ sentTo: string }>> {
  try {
    const contract = await getContractByToken(token)
    if (!contract) return { ok: false, error: "Invalid signing link." }
    if (contract.status === "SIGNED") return { ok: false, error: "Contract already signed." }
    if (contract.sign_link_used_at) return { ok: false, error: "Signing link already used." }
    if (isExpired(contract.sign_link_expires_at)) return { ok: false, error: "Signing link expired." }
    if (!contract.email) return { ok: false, error: "Retailer email is missing." }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return {
        ok: false,
        error: "Email is not configured. Set RESEND_API_KEY to enable OTP sending.",
      }
    }

    const supabase = createAdminClient()
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
      .eq("id", contract.id)
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

export async function verifyContractOtpByTokenAction(input: {
  token: string
  otp: string
}): Promise<ActionResult<{ verifiedAt: string }>> {
  try {
    const contract = await getContractByToken(input.token)
    if (!contract) return { ok: false, error: "Invalid signing link." }
    if (contract.status === "SIGNED") return { ok: false, error: "Contract already signed." }
    if (contract.sign_link_used_at) return { ok: false, error: "Signing link already used." }
    if (isExpired(contract.sign_link_expires_at)) return { ok: false, error: "Signing link expired." }

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
    const supabase = createAdminClient()

    if (!ok) {
      const { error: incErr } = await supabase
        .from("contracts")
        .update({ otp_attempts: attempts + 1 })
        .eq("id", contract.id)
      if (incErr) return { ok: false, error: incErr.message }
      return { ok: false, error: "Invalid OTP." }
    }

    const verifiedAt = new Date().toISOString()
    const meta = await getRequestMeta()
    const shouldCloseLink =
      !!contract.retailer_signature_path && !!contract.retailer_ack && !!contract.retailer_gdpr

    const { error: verErr } = await supabase
      .from("contracts")
      .update({
        otp_verified_at: verifiedAt,
        otp_verify_ip: meta.ip,
        otp_verify_user_agent: meta.userAgent,
        sign_link_used_at: shouldCloseLink ? verifiedAt : contract.sign_link_used_at,
      })
      .eq("id", contract.id)
    if (verErr) return { ok: false, error: verErr.message }

    return { ok: true, data: { verifiedAt } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function getDraftContractPdfAction(
  token: string,
): Promise<ActionResult<string>> {
  try {
    const contract = await getContractByToken(token)
    if (!contract) return { ok: false, error: "Invalid signing link." }

    const { pdfBytes } = await buildDraftContractPdf(contract, "Staff Manager")
    const base64 = Buffer.from(pdfBytes).toString("base64")

    return { ok: true, data: base64 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
