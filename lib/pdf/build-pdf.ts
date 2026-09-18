import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib"
import {
  page1Intro,
  page1Body,
  page2Body,
  page3Body,
  page3Outro,
  page5Body,
  page6Body,
  page7Body,
  type ContractFields,
} from "./contract-text"

// ---------- Palette ----------
const BLACK = rgb(0, 0, 0)
const MUTED = rgb(0.4, 0.4, 0.4)
const LYCA_BLUE = rgb(0x1a / 255, 0x56 / 255, 0xa3 / 255)
const BRAND_NAVY = rgb(0x21 / 255, 0x26 / 255, 0x4e / 255) // #21264e
const SUMMARY_BG = rgb(0xff / 255, 0xf7 / 255, 0xf2 / 255) // #fff7f2

// ---------- Layout ----------
const PAGE_W = 595.28 // A4 portrait
const PAGE_H = 841.89
const MARGIN_X = 56
const MARGIN_TOP = 48
const MARGIN_BOTTOM = 56 // footer label sits at y=30; body must stop above this
const FOOTER_Y = 30
const BODY_SIZE = 10
const LINE_HEIGHT = 13

interface Block {
  text: string
  bold?: boolean
  align?: "left" | "center"
}

interface BuildArgs {
  fields: ContractFields
  retailerSignaturePng?: Uint8Array | null
  staffSignaturePng?: Uint8Array | null
  /** Universal Service logo as PNG bytes — rendered on page 1. */
  usLogoPng?: Uint8Array | null
  /** Lycamobile logo as PNG bytes — rendered on page 4 header. */
  lycaLogoPng?: Uint8Array | null
  /** Full name of the staff user generating/signing the contract. */
  staffSignerName?: string
  contractId?: string
  staffSignedAtIso?: string
  otpProof?: { retailerName: string; email: string; verifiedAtIso: string; verifyIp?: string | null }
}

export async function buildContractPdf({
  fields,
  retailerSignaturePng,
  staffSignaturePng,
  usLogoPng,
  lycaLogoPng,
  staffSignerName,
  contractId,
  staffSignedAtIso,
  otpProof,
}: BuildArgs): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const usLogo = usLogoPng ? await pdf.embedPng(usLogoPng) : null
  const lycaLogo = lycaLogoPng ? await pdf.embedPng(lycaLogoPng) : null
  const retailerSig = retailerSignaturePng ? await pdf.embedPng(retailerSignaturePng) : null
  const staffSig = staffSignaturePng ? await pdf.embedPng(staffSignaturePng) : null

  // Ensure retailer name (companyName) and staff name are uppercase as requested
  if (fields.companyName) {
    fields.companyName = fields.companyName.toUpperCase()
  }
  if (fields.contactPerson) {
    fields.contactPerson = fields.contactPerson.toUpperCase()
  }
  if (fields.firstName) {
    fields.firstName = fields.firstName.toUpperCase()
  }
  if (fields.surname) {
    fields.surname = fields.surname.toUpperCase()
  }
  if (fields.shopName) {
    fields.shopName = fields.shopName.toUpperCase()
  }

  const staffName = (staffSignerName?.trim() || "Staff").toUpperCase()
  const otp = otpProof
    ? {
        retailerName: otpProof.retailerName,
        email: otpProof.email,
        verifiedAtIso: otpProof.verifiedAtIso,
        verifyIp: otpProof.verifyIp ?? null,
      }
    : null

  const hasSignatureSummaryPage = Boolean(contractId && staffSignedAtIso)
  const totalPages = hasSignatureSummaryPage ? 8 : 7

  const winAnsiSafe = (input: string) =>
    (input || "")
      .replaceAll("\u2011", "-")
      .replaceAll("\u2013", "-")
      .replaceAll("\u2014", "-")
      .replaceAll("\u00A0", " ")
      .replaceAll("\u202F", " ")

  // Helper: wrap text into lines fitting a given width
  const wrap = (text: string, maxW: number, f: PDFFont, size: number) => {
    if (!text) return [""]
    const words = text.split(/\s+/)
    const lines: string[] = []
    let cur = ""
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w
      if (f.widthOfTextAtSize(test, size) > maxW && cur) {
        lines.push(cur)
        cur = w
      } else {
        cur = test
      }
    }
    if (cur) lines.push(cur)
    return lines
  }

  const formatTimestamp = (iso: string | null | undefined) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const local = d.toLocaleString("it-IT", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    return `${local} (${d.toISOString()})`
  }

  const maskIp = (rawIp: string | null | undefined) => {
    const raw = (rawIp || "").trim()
    if (!raw) return "-"
    const first = (raw.split(",")[0] || "").trim()
    if (!first) return "-"

    if (first.includes(".")) {
      const candidate = first.includes(":") ? first.slice(first.lastIndexOf(":") + 1) : first
      const parts = candidate.split(".").map((p) => p.trim()).filter(Boolean)
      if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`
      return "***.***.***.***"
    }

    if (first.includes(":")) {
      const candidate = (first.split("%")[0] || "").trim()
      const parts = candidate.split(":").map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2) return `${parts[0]}:${parts[1]}:****:****:****:****`
      return "****:****:****:****"
    }

    return "-"
  }

  interface Segment {
    text: string
    bold: boolean
  }

  /**
   * Draws blocks sequentially. Stops before the page footer so body copy never
   * bleeds into the page number. Returns the final Y (for the caller to append
   * additional elements like tables or signature rows).
   */
  const drawBlocks = (
    page: PDFPage,
    blocks: Block[],
    startY: number,
    pageNumber: number,
    opts?: { paragraphGap?: number; bottomLimit?: number },
  ) => {
    let y = startY
    const maxW = PAGE_W - MARGIN_X * 2
    const defaultGap = opts?.paragraphGap ?? 5
    const bottom = opts?.bottomLimit ?? MARGIN_BOTTOM
    const size = BODY_SIZE

    for (const b of blocks) {
      let text = winAnsiSafe(b.text)
      if (!text) {
        y -= LINE_HEIGHT / 2
        continue
      }

      // Additional space before specific headers
      if (text === "IL PRESENTE CONTRATTO È ORA MODIFICATO COME SEGUE:") {
        y -= 10
      }

      // Split text into segments (bold vs normal)
      const segments: Segment[] = []
      if (pageNumber === 4) {
        segments.push({ text, bold: b.bold || false })
      } else {
        const parts = text.split(/(\[\[B\]\].*?\[\[B\]\])/g)
        for (const p of parts) {
          if (p.startsWith("[[B]]") && p.endsWith("[[B]]")) {
            segments.push({ text: p.replace(/\[\[B\]\]/g, ""), bold: true })
          } else if (p) {
            segments.push({ text: p, bold: b.bold || false })
          }
        }
      }

      // Wrap lines considering mixed fonts
      const lines: Segment[][] = []
      let currentLine: Segment[] = []
      let currentLineWidth = 0

      for (const seg of segments) {
        const f = seg.bold ? fontBold : font
        const words = seg.text.split(/(\s+)/) // Keep whitespace
        
        for (const w of words) {
          const wWidth = f.widthOfTextAtSize(w, size)
          if (currentLineWidth + wWidth > maxW && currentLine.length > 0 && w.trim()) {
            lines.push(currentLine)
            currentLine = []
            currentLineWidth = 0
            // If it's a space at the start of a new line, skip it
            if (!w.trim()) continue
          }
          
          // Add word to current line
          if (currentLine.length > 0 && currentLine[currentLine.length - 1].bold === seg.bold) {
            currentLine[currentLine.length - 1].text += w
          } else {
            currentLine.push({ text: w, bold: seg.bold })
          }
          currentLineWidth += wWidth
        }
      }
      if (currentLine.length > 0) lines.push(currentLine)

      // Draw lines
      for (const line of lines) {
        if (y < bottom) return y
        let x = MARGIN_X
        if (b.align === "center") {
          let lineW = 0
          for (const seg of line) {
            const f = seg.bold ? fontBold : font
            lineW += f.widthOfTextAtSize(seg.text, size)
          }
          x = (PAGE_W - lineW) / 2
        }

        for (const seg of line) {
          const f = seg.bold ? fontBold : font
          const safeText = winAnsiSafe(seg.text)
          page.drawText(safeText, { x, y, size, font: f, color: BLACK })
          x += f.widthOfTextAtSize(safeText, size)
        }
        y -= LINE_HEIGHT
      }
      y -= defaultGap
    }
    return y
  }

  const drawPageFooter = (page: PDFPage, n: number, color = MUTED) => {
    const label = `${n} di ${totalPages}`
    const w = font.widthOfTextAtSize(label, 9)
    page.drawText(label, {
      x: PAGE_W - MARGIN_X - w,
      y: FOOTER_Y,
      size: 9,
      font,
      color,
    })
  }

  const drawSignatureSummaryPage = (page: PDFPage) => {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: SUMMARY_BG,
    })

    const headerH = 72
    const headerY = PAGE_H - headerH
    page.drawRectangle({
      x: 0,
      y: headerY,
      width: PAGE_W,
      height: headerH,
      color: BRAND_NAVY,
    })

    if (usLogo) {
      const maxH = headerH - 22
      const maxW = 170
      const ratio = Math.min(maxW / usLogo.width, maxH / usLogo.height)
      const w = usLogo.width * ratio
      const h = usLogo.height * ratio
      page.drawImage(usLogo, {
        x: MARGIN_X,
        y: headerY + (headerH - h) / 2,
        width: w,
        height: h,
      })
    }

    const headerRightX = PAGE_W - MARGIN_X
    const contractNo = winAnsiSafe((contractId || "").split("-")[0] || "")
    const headerDate = (() => {
      const d = new Date(staffSignedAtIso || "")
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("it-IT")
      return fields.date
    })()

    const rightLine1 = winAnsiSafe(`ID Contratto: ${contractNo}`)
    const rightLine2 = winAnsiSafe(`Data: ${headerDate}`)
    const headerFontSize = 10
    const headerLineGap = 14
    const r1W = fontBold.widthOfTextAtSize(rightLine1, headerFontSize)
    const r2W = fontBold.widthOfTextAtSize(rightLine2, headerFontSize)
    page.drawText(rightLine1, {
      x: headerRightX - r1W,
      y: headerY + headerH - 26,
      size: headerFontSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
    page.drawText(rightLine2, {
      x: headerRightX - r2W,
      y: headerY + headerH - 26 - headerLineGap,
      size: headerFontSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    })

    const title = winAnsiSafe("RIEPILOGO FIRME (MOLTO IMPORTANTE)")
    const titleSize = 13
    page.drawText(title, {
      x: MARGIN_X,
      y: headerY - 26,
      size: titleSize,
      font: fontBold,
      color: BRAND_NAVY,
    })
    page.drawLine({
      start: { x: MARGIN_X, y: headerY - 34 },
      end: { x: PAGE_W - MARGIN_X, y: headerY - 34 },
      thickness: 1,
      color: BRAND_NAVY,
    })

    let y = headerY - 58
    const labelX = MARGIN_X
    const valueX = MARGIN_X + 170
    const maxValueW = PAGE_W - MARGIN_X - valueX
    const kvSize = 11
    const kvLineH = 14

    const drawKv = (label: string, value: string) => {
      const safeLabel = winAnsiSafe(label)
      const safeValue = winAnsiSafe(value || "")
      page.drawText(safeLabel, { x: labelX, y, size: kvSize, font: fontBold, color: BRAND_NAVY })
      const lines = wrap(safeValue, maxValueW, font, kvSize)
      let yy = y
      for (const line of lines) {
        page.drawText(winAnsiSafe(line), { x: valueX, y: yy, size: kvSize, font, color: BRAND_NAVY })
        yy -= kvLineH
      }
      y = yy - 6
    }

    const drawMergedRow = (text: string) => {
      const safe = winAnsiSafe(text || "")
      const w = PAGE_W - MARGIN_X * 2
      const size = 10
      const lines = wrap(safe, w, font, size)
      for (const line of lines) {
        page.drawText(winAnsiSafe(line), { x: labelX, y, size, font, color: BRAND_NAVY })
        y -= 13
      }
      y -= 6
    }

    const retailerName = (otp?.retailerName || fields.contactPerson || fields.companyName || "").trim()
    const otpEmail = (otp?.email || fields.email || "").trim()
    const otpVerified = otp ? "Sì" : "No"
    const otpVerifiedAt = otp ? formatTimestamp(otp.verifiedAtIso) : ""
    const staffSignedAt = formatTimestamp(staffSignedAtIso)
    const safeContractId = ((contractId || "").split("-")[0] || "").trim()
    const maskedIp = maskIp(otp?.verifyIp)

    drawKv("Ragione sociale:", fields.companyName)
    drawKv("Indirizzo:", fields.address || fields.shopAddress)
    drawKv("Partita IVA:", fields.vatNumber)
    drawKv("Numero cellulare:", fields.mobileNumber)
    drawKv("Numero fisso:", fields.landlineNumber)

    y -= 8
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_W - MARGIN_X, y },
      thickness: 1,
      color: BRAND_NAVY,
    })
    y -= 18

    drawKv("Nome rivenditore:", retailerName)
    drawKv("Email usata per OTP:", otpEmail)
    drawKv("OTP verificato:", otpVerified)
    drawMergedRow(
      "Momento di perfezionamento del contratto: coincidente con la verifica OTP del Rivenditore",
    )
    drawMergedRow(`Indirizzo IP del dispositivo al momento della firma: ${maskedIp}`)
    drawKv("Data e ora (timestamp):", otpVerifiedAt)
    drawKv("ID Contratto:", safeContractId)

    y -= 8
    page.drawText(winAnsiSafe("Firme"), { x: labelX, y, size: 12, font: fontBold, color: BRAND_NAVY })
    y -= 18
    page.drawText(winAnsiSafe("Rivenditore"), { x: labelX, y, size: 10, font: fontBold, color: BRAND_NAVY })
    page.drawText(winAnsiSafe("Firma del Responsabile"), {
      x: PAGE_W - MARGIN_X - fontBold.widthOfTextAtSize(winAnsiSafe("Firma del Responsabile"), 10),
      y,
      size: 10,
      font: fontBold,
      color: BRAND_NAVY,
    })
    y -= 10

    const boxGap = 16
    const boxW = (PAGE_W - MARGIN_X * 2 - boxGap) / 2
    const boxH = 104
    const leftBoxX = MARGIN_X
    const rightBoxX = MARGIN_X + boxW + boxGap
    const boxY = y - boxH

    page.drawRectangle({
      x: leftBoxX,
      y: boxY,
      width: boxW,
      height: boxH,
      color: rgb(1, 1, 1),
      borderColor: BRAND_NAVY,
      borderWidth: 0.8,
    })
    page.drawRectangle({
      x: rightBoxX,
      y: boxY,
      width: boxW,
      height: boxH,
      color: rgb(1, 1, 1),
      borderColor: BRAND_NAVY,
      borderWidth: 0.8,
    })

    if (retailerSig) {
      const maxW = boxW - 16
      const maxH = boxH - 18
      const ratio = Math.min(maxW / retailerSig.width, maxH / retailerSig.height)
      const w = retailerSig.width * ratio
      const h = retailerSig.height * ratio
      page.drawImage(retailerSig, {
        x: leftBoxX + (boxW - w) / 2,
        y: boxY + (boxH - h) / 2,
        width: w,
        height: h,
        opacity: 0.95,
      })
    } else {
      const txt = winAnsiSafe("Non disponibile")
      const tw = font.widthOfTextAtSize(txt, 10)
      page.drawText(txt, { x: leftBoxX + (boxW - tw) / 2, y: boxY + boxH / 2 - 5, size: 10, font, color: BRAND_NAVY })
    }

    if (staffSig) {
      const maxW = boxW - 16
      const maxH = boxH - 18
      const ratio = Math.min(maxW / staffSig.width, maxH / staffSig.height)
      const w = staffSig.width * ratio
      const h = staffSig.height * ratio
      page.drawImage(staffSig, {
        x: rightBoxX + (boxW - w) / 2,
        y: boxY + (boxH - h) / 2,
        width: w,
        height: h,
        opacity: 0.95,
      })
    } else {
      const txt = winAnsiSafe("Non disponibile")
      const tw = font.widthOfTextAtSize(txt, 10)
      page.drawText(txt, { x: rightBoxX + (boxW - tw) / 2, y: boxY + boxH / 2 - 5, size: 10, font, color: BRAND_NAVY })
    }

    const signedByY = boxY - 14
    const signedByLabel = winAnsiSafe("Firmato da")
    page.drawText(signedByLabel, { x: leftBoxX, y: signedByY, size: 9, font: fontBold, color: BRAND_NAVY })
    page.drawText(signedByLabel, { x: rightBoxX, y: signedByY, size: 9, font: fontBold, color: BRAND_NAVY })

    const nameY = signedByY - 12
    page.drawText(winAnsiSafe(retailerName), { x: leftBoxX, y: nameY, size: 10, font: font, color: BRAND_NAVY })
    page.drawText(winAnsiSafe(staffName), { x: rightBoxX, y: nameY, size: 10, font: font, color: BRAND_NAVY })

    const tsSize = 8.5
    const tsLineH = 11
    const retailerTsY = nameY - 12
    const staffTsY = nameY - 12
    const retailerTsLines = wrap(winAnsiSafe(otpVerifiedAt || ""), boxW, font, tsSize)
    const staffTsLines = wrap(winAnsiSafe(staffSignedAt || ""), boxW, font, tsSize)
    for (let i = 0; i < Math.max(retailerTsLines.length, staffTsLines.length); i++) {
      const l = retailerTsLines[i]
      if (l) page.drawText(winAnsiSafe(l), { x: leftBoxX, y: retailerTsY - i * tsLineH, size: tsSize, font, color: BRAND_NAVY })
      const r = staffTsLines[i]
      if (r) page.drawText(winAnsiSafe(r), { x: rightBoxX, y: staffTsY - i * tsLineH, size: tsSize, font, color: BRAND_NAVY })
    }

    y = retailerTsY - Math.max(retailerTsLines.length, staffTsLines.length) * tsLineH - 10

    const paragraphMaxW = PAGE_W - MARGIN_X * 2
    const paragraphSize = 10
    const paragraphLineH = 13
    const paragraphGap = 8

    const drawParagraph = (text: string) => {
      const safe = winAnsiSafe(text)
      const lines = wrap(safe, paragraphMaxW, font, paragraphSize)
      for (const line of lines) {
        page.drawText(winAnsiSafe(line), { x: MARGIN_X, y, size: paragraphSize, font, color: BRAND_NAVY })
        y -= paragraphLineH
      }
      y -= paragraphGap
    }

    drawParagraph(
      "Il presente Contratto è sottoscritto mediante firma elettronica attraverso la piattaforma RCM (Retailer Contract Management).",
    )
    drawParagraph(
      "Il Rivenditore dichiara che la firma è stata apposta personalmente, previa verifica dell’identità tramite codice OTP inviato all’indirizzo e‑mail indicato, e riconosce che la presente sottoscrizione è a lui pienamente riconducibile.",
    )
    drawParagraph(
      "Le Parti riconoscono che il presente Contratto è valido ed efficace ai sensi del Regolamento (UE) n. 910/2014 (eIDAS) e degli articoli 20 e 21 del Codice dell’Amministrazione Digitale, ed è giuridicamente vincolante e opponibile.",
    )

    const footerH = 64
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: footerH, color: BRAND_NAVY })
    const footerLines = [
      "Distributore Autorizzato Lycamobile",
      "Universal Service 2006 S.R.L. · Via Genzano 195, 00179 Roma",
      "P.IVA: IT 09037721009",
    ]
    const footerSize = 7.5
    const footerStartY = 40
    for (let i = 0; i < footerLines.length; i++) {
      const t = winAnsiSafe(footerLines[i]!)
      const tw = fontBold.widthOfTextAtSize(t, footerSize)
      page.drawText(t, {
        x: (PAGE_W - tw) / 2,
        y: footerStartY - i * 12,
        size: footerSize,
        font: fontBold,
        color: rgb(1, 1, 1),
      })
    }

    const pageLabel = `${totalPages} di ${totalPages}`
    const pageLabelW = font.widthOfTextAtSize(pageLabel, 9)
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN_X - pageLabelW,
      y: 14,
      size: 9,
      font,
      color: rgb(1, 1, 1),
    })
  }

  // ---------- PAGE 1 ----------
  const p1 = pdf.addPage([PAGE_W, PAGE_H])
  if (usLogo) {
    // Constrain logo to a small banner so we leave plenty of room for body copy.
    const maxH = 58
    const maxW = 180
    const ratio = Math.min(maxW / usLogo.width, maxH / usLogo.height)
    const w = usLogo.width * ratio
    const h = usLogo.height * ratio
    p1.drawImage(usLogo, {
      x: (PAGE_W - w) / 2,
      y: PAGE_H - MARGIN_TOP - h,
      width: w,
      height: h,
    })
  }
  let y1 = PAGE_H - MARGIN_TOP - (usLogo ? 72 : 20)
  y1 = drawBlocks(p1, page1Intro(fields), y1, 1, { paragraphGap: 6 })
  y1 -= 4
  drawBlocks(p1, page1Body, y1, 1, { paragraphGap: 4 })
  drawPageFooter(p1, 1)

  // ---------- PAGE 2 ----------
  const p2 = pdf.addPage([PAGE_W, PAGE_H])
  drawBlocks(p2, page2Body, PAGE_H - 40, 2, { paragraphGap: 2 })
  drawPageFooter(p2, 2)

  // ---------- PAGE 3: clauses + SIM price table + signatures ----------
  const p3 = pdf.addPage([PAGE_W, PAGE_H])
  let y3 = drawBlocks(p3, page3Body, PAGE_H - MARGIN_TOP, 3, { paragraphGap: 4 })
  y3 -= 6
  y3 = drawSimPriceTable(p3, font, fontBold, y3)
  y3 -= 40
  y3 = drawBlocks(p3, page3Outro, y3, 3, { paragraphGap: 4 })
  y3 -= 8
  drawFourPartySignatureBlock(p3, font, fontBold, retailerSig, staffSig, y3, fields, staffName, otp)
  drawPageFooter(p3, 3)

  // ---------- PAGE 4: Modulo di Registrazione Rivenditore ----------
  const p4 = pdf.addPage([PAGE_W, PAGE_H])
  drawPage4RegistrationForm(p4, font, fontBold, fields, retailerSig, staffSig, lycaLogo, otp)
  drawPageFooter(p4, 4)

  // ---------- PAGE 5 ----------
  const p5 = pdf.addPage([PAGE_W, PAGE_H])
  drawBlocks(p5, page5Body(fields), PAGE_H - 40, 5, { paragraphGap: 8 })
  drawPageFooter(p5, 5)

  // ---------- PAGE 6 ----------
  const p6 = pdf.addPage([PAGE_W, PAGE_H])
  drawBlocks(p6, page6Body, PAGE_H - MARGIN_TOP, 6, { paragraphGap: 4 })
  drawPageFooter(p6, 6)

  // ---------- PAGE 7 ----------
  const p7 = pdf.addPage([PAGE_W, PAGE_H])
  // Reserve 120pt at the bottom for the signature block so body text never overlaps.
  const p7BottomReserve = MARGIN_BOTTOM + 130
  let y7 = drawBlocks(p7, page7Body, PAGE_H - MARGIN_TOP, 7, {
    paragraphGap: 4,
    bottomLimit: p7BottomReserve,
  })
  // Place signature block at a fixed location near bottom.
  const sigTop = Math.min(y7 - 20, MARGIN_BOTTOM + 120)
  drawFinalSignatureBlock(p7, font, fontBold, retailerSig, staffSig, sigTop, fields, staffName, otp)
  drawPageFooter(p7, 7)

  if (hasSignatureSummaryPage) {
    const p8 = pdf.addPage([PAGE_W, PAGE_H])
    drawSignatureSummaryPage(p8)
  }

  return await pdf.save()
}

// ============================================================
// Page 3 — SIM price tables
// ============================================================

function drawSimPriceTable(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  startY: number,
): number {
  const tableW = 380
  const x = (PAGE_W - tableW) / 2
  const colW = tableW / 2
  const rowH = 20
  let y = startY

  const drawOneTable = (
    rows: Array<{ a: string; b: string; headerStyle?: boolean }>,
    top: number,
  ) => {
    let yy = top
    for (const row of rows) {
      const isHeader = row.headerStyle
      if (isHeader) {
        page.drawRectangle({
          x,
          y: yy - rowH,
          width: tableW,
          height: rowH,
          color: rgb(0.93, 0.93, 0.93),
        })
      }
      page.drawRectangle({
        x,
        y: yy - rowH,
        width: tableW,
        height: rowH,
        borderColor: BLACK,
        borderWidth: 0.5,
      })
      page.drawLine({
        start: { x: x + colW, y: yy },
        end: { x: x + colW, y: yy - rowH },
        thickness: 0.5,
        color: BLACK,
      })
      const f = isHeader ? fontBold : font
      const textY = yy - rowH + 6
      const aW = f.widthOfTextAtSize(row.a, 10)
      const bW = f.widthOfTextAtSize(row.b, 10)
      page.drawText(row.a, { x: x + (colW - aW) / 2, y: textY, size: 10, font: f, color: BLACK })
      page.drawText(row.b, { x: x + colW + (colW - bW) / 2, y: textY, size: 10, font: f, color: BLACK })
      yy -= rowH
    }
    return yy
  }

  y = drawOneTable(
    [
      { a: "Valore nominale", b: "Prezzo", headerStyle: true },
      { a: "Scheda SIM con credito telefonico di € 0", b: "Omaggio" },
    ],
    y,
  )
  y -= 10
  y = drawOneTable(
    [
      { a: "Valore nominale", b: "Prezzo", headerStyle: true },
      { a: "Scheda SIM con credito telefonico di € 5", b: "€ 4,50" },
    ],
    y,
  )
  return y
}

/**
 * Four-slot signature block used on page 3:
 * Rivenditore / Staff / Office / Hotspot Manager / Fornitore.
 * Each row shows:
 *   ______________   ______________   ______________
 *   Label             Firmato da : <name>   Data : <date>
 */
function drawFourPartySignatureBlock(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  retailerSig: PDFImage | null,
  staffSig: PDFImage | null,
  startY: number,
  f: ContractFields,
  staffName: string,
  otp: { retailerName: string; email: string; verifiedAtIso: string } | null,
) {
  const entries: Array<{
    label: string
    image: PDFImage | null
    signedBy: string
  }> = [
    { label: "Rivenditore", image: retailerSig, signedBy: f.contactPerson },
    { label: "Staff", image: staffSig, signedBy: staffName },
    { label: "Office / Hotspot Manager", image: null, signedBy: "" },
    { label: "Fornitore", image: null, signedBy: "" },
  ]

  let y = startY
  const rowH = 44
  const lineLen = 150
  const col1X = MARGIN_X
  const col2X = MARGIN_X + lineLen + 30
  const col3X = MARGIN_X + lineLen * 2 + 60

  for (const entry of entries) {
    if (y < MARGIN_BOTTOM + rowH - 10) break
    const lineY = y - 18
    page.drawLine({
      start: { x: col1X, y: lineY },
      end: { x: col1X + lineLen, y: lineY },
      thickness: 0.5,
      color: BLACK,
    })
    page.drawLine({
      start: { x: col2X, y: lineY },
      end: { x: col2X + lineLen, y: lineY },
      thickness: 0.5,
      color: BLACK,
    })
    page.drawLine({
      start: { x: col3X, y: lineY },
      end: { x: col3X + lineLen, y: lineY },
      thickness: 0.5,
      color: BLACK,
    })

    if (entry.image) {
      const maxW = lineLen - 10
      const maxH = 48 // Increased height for more natural scale
      const ratio = Math.min(maxW / entry.image.width, maxH / entry.image.height)
      const w = entry.image.width * ratio
      const h = entry.image.height * ratio
      page.drawImage(entry.image, {
        x: col1X + (lineLen - w) / 2,
        y: lineY - 5,
        width: w,
        height: h,
        opacity: 0.95, // Slight transparency for ink-on-paper look
      })
    }

    // Firmato da — printed name above the line
    if (entry.signedBy) {
      page.drawText(entry.signedBy.toUpperCase(), {
        x: col2X + 4,
        y: lineY + 2,
        size: 9, // Reduced from 10 to match other pages and look more natural
        font,
        color: BLACK,
      })
      // Data — filled with contract date when the row represents a signed party
      page.drawText(f.date, {
        x: col3X + 4,
        y: lineY + 2,
        size: 9, // Reduced from 10
        font,
        color: BLACK,
      })
    }

    // Labels under each line
    page.drawText(entry.label, { x: col1X, y: lineY - 12, size: 9, font, color: BLACK })
    page.drawText("Firmato da :", { x: col2X, y: lineY - 12, size: 9, font, color: BLACK })
    page.drawText("Data :", { x: col3X, y: lineY - 12, size: 9, font, color: BLACK })

    if (entry.label === "Rivenditore" && otp) {
      const ts = new Date(otp.verifiedAtIso).toLocaleString("it-IT", {
        timeZone: "Europe/Rome",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      const otpFontSize = 6
      page.drawText(`${otp.retailerName}`, { x: col1X, y: lineY + 10, size: otpFontSize, font, color: MUTED })
      page.drawText(`OTP: ${ts} · ${otp.email}`, { x: col1X, y: lineY + 2, size: otpFontSize, font, color: MUTED })
    }

    y -= rowH
  }
}

// ============================================================
// Page 4 — Registrazione Rivenditore
// ============================================================

function drawPage4RegistrationForm(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  f: ContractFields,
  retailerSig: PDFImage | null,
  staffSig: PDFImage | null,
  lycaLogo: PDFImage | null,
  otp: { retailerName: string; email: string; verifiedAtIso: string } | null,
) {
  // ----- Left header: Universal Service contact block -----
  let y = PAGE_H - MARGIN_TOP
  const leftLines = [
    "Universal Service 2006 Srl",
    "Via Genzano, 195",
    "00179, Roma",
    "Italia",
    "Tel: 0689971909",
    "Fax: 06765455",
    "Email: hotspot.it@lycamobile.com",
  ]
  for (const line of leftLines) {
    page.drawText(line, { x: MARGIN_X, y, size: 10, font, color: BLACK })
    y -= 13
  }

  // ----- Right header: LycaMobile logo -----
  if (lycaLogo) {
    const maxH = 70
    const maxW = 180
    const ratio = Math.min(maxW / lycaLogo.width, maxH / lycaLogo.height)
    const w = lycaLogo.width * ratio
    const h = lycaLogo.height * ratio
    page.drawImage(lycaLogo, {
      x: PAGE_W - MARGIN_X - w,
      y: PAGE_H - MARGIN_TOP - h + 6,
      width: w,
      height: h,
    })
  }

  // ----- Title -----
  const title = "MODULO DI REGISTRAZIONE RIVENDITORE"
  const titleSize = 15
  const titleW = fontBold.widthOfTextAtSize(title, titleSize)
  const titleY = PAGE_H - MARGIN_TOP - 120
  page.drawText(title, {
    x: (PAGE_W - titleW) / 2,
    y: titleY,
    size: titleSize,
    font: fontBold,
    color: LYCA_BLUE,
  })

  page.drawText("*Da compilare a cura del Rivenditore", {
    x: MARGIN_X + 30,
    y: titleY - 40,
    size: 10,
    font,
    color: BLACK,
  })

  // ----- Two-column registration table -----
  const tableTop = titleY - 60
  const tableX = MARGIN_X + 30
  const tableW = PAGE_W - 2 * (MARGIN_X + 30)
  const col1W = 180
  const rowH = 24 // Reduced from 30 for a tighter, more professional look

  const rows: Array<[string, string]> = [
    ["Nome*", f.firstName],
    ["Cognome*", f.surname],
    ["Nome Negozio*", f.shopName],
    ["Indirizzo Negozio*", f.street],
    ["Numero Civico*", f.houseNumber],
    ["Città*", f.city],
    ["CAP*", f.postCode],
    ["Telefono Fisso*", f.landlineNumber || "-"],
    ["Telefono Mobile*", f.mobileNumber],
    ["Indirizzo Email*", f.email],
  ]

  let ry = tableTop
  for (const [label, value] of rows) {
    // Label background
    page.drawRectangle({
      x: tableX,
      y: ry - rowH,
      width: col1W,
      height: rowH,
      color: rgb(0.96, 0.96, 0.96),
    })

    page.drawRectangle({
      x: tableX,
      y: ry - rowH,
      width: tableW,
      height: rowH,
      borderColor: BLACK,
      borderWidth: 0.5,
    })
    page.drawLine({
      start: { x: tableX + col1W, y: ry },
      end: { x: tableX + col1W, y: ry - rowH },
      thickness: 0.5,
      color: BLACK,
    })
    page.drawText(label, {
      x: tableX + 8,
      y: ry - rowH + 8, // Adjusted offset for smaller rowH
      size: 10,
      font: fontBold,
      color: BLACK,
    })
    page.drawText(value, {
      x: tableX + col1W + 8,
      y: ry - rowH + 8, // Adjusted offset
      size: 10,
      font,
      color: BLACK,
    })
    ry -= rowH
  }

  // ----- Signature rows -----
  ry -= 60
  const sigLineLen = 180
  const dateLineLen = 100

  page.drawText("Firma del Rivenditore:", {
    x: tableX,
    y: ry,
    size: 10,
    font,
    color: BLACK,
  })
  const sigLineX = tableX + 140
  const sigLineY = ry - 2
  page.drawLine({
    start: { x: sigLineX, y: sigLineY },
    end: { x: sigLineX + sigLineLen, y: sigLineY },
    thickness: 0.5,
    color: BLACK,
  })
  if (retailerSig) {
    const maxW = sigLineLen - 10
    const maxH = 54 // Larger for registration form
    const ratio = Math.min(maxW / retailerSig.width, maxH / retailerSig.height)
    const w = retailerSig.width * ratio
    const h = retailerSig.height * ratio
    page.drawImage(retailerSig, {
      x: sigLineX + (sigLineLen - w) / 2,
      y: sigLineY - 5,
      width: w,
      height: h,
      opacity: 0.95,
    })
  }
  if (otp) {
    const ts = new Date(otp.verifiedAtIso).toLocaleString("it-IT", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    const otpFontSize = 6
    page.drawText(`${otp.retailerName}`, { x: sigLineX, y: ry + 12, size: otpFontSize, font, color: MUTED })
    page.drawText(`OTP: ${ts} · ${otp.email}`, { x: sigLineX, y: ry + 4, size: otpFontSize, font, color: MUTED })
  }
  page.drawText("Data:", {
    x: sigLineX + sigLineLen + 20,
    y: ry,
    size: 10,
    font,
    color: BLACK,
  })
  const dateLineX = sigLineX + sigLineLen + 55
  page.drawLine({
    start: { x: dateLineX, y: sigLineY },
    end: { x: dateLineX + dateLineLen, y: sigLineY },
    thickness: 0.5,
    color: BLACK,
  })
  page.drawText(f.date, {
    x: dateLineX + 6,
    y: ry - 1,
    size: 10,
    font,
    color: BLACK,
  })

  ry -= 46
  page.drawText("Firma del responsabile di zona:", {
    x: tableX,
    y: ry,
    size: 10,
    font,
    color: BLACK,
  })
  const zLineX = tableX + 180
  const zLineY = ry - 2
  page.drawLine({
    start: { x: zLineX, y: zLineY },
    end: { x: zLineX + sigLineLen, y: zLineY },
    thickness: 0.5,
    color: BLACK,
  })
  if (staffSig) {
    const maxW = sigLineLen - 10
    const maxH = 54
    const ratio = Math.min(maxW / staffSig.width, maxH / staffSig.height)
    const w = staffSig.width * ratio
    const h = staffSig.height * ratio
    page.drawImage(staffSig, {
      x: zLineX + (sigLineLen - w) / 2,
      y: zLineY - 5,
      width: w,
      height: h,
      opacity: 0.95,
    })
  }

  // Blue horizontal divider
  ry -= 28
  page.drawRectangle({
    x: tableX,
    y: ry,
    width: tableW,
    height: 1.2,
    color: LYCA_BLUE,
  })

  ry -= 20
  page.drawText("**Per Uso Ufficio:", {
    x: tableX,
    y: ry,
    size: 10,
    font,
    color: BLACK,
  })
  ry -= 26
  page.drawText("Firma Office manager:", {
    x: tableX,
    y: ry,
    size: 10,
    font,
    color: BLACK,
  })
  const oLineX = tableX + 150
  page.drawLine({
    start: { x: oLineX, y: ry - 2 },
    end: { x: oLineX + sigLineLen, y: ry - 2 },
    thickness: 0.5,
    color: BLACK,
  })
}

// ============================================================
// Page 7 — Final signature block
// ============================================================

function drawFinalSignatureBlock(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  retailerSig: PDFImage | null,
  staffSig: PDFImage | null,
  startY: number,
  f: ContractFields,
  staffName: string,
  otp: { retailerName: string; email: string; verifiedAtIso: string } | null,
) {
  const rows: Array<{ label: string; image: PDFImage | null; signedBy: string }> = [
    { label: "Rivenditore", image: retailerSig, signedBy: f.contactPerson },
    { label: "Fornitore", image: null, signedBy: "" },
  ]
  let y = startY
  const rowH = 54
  const lineLen = 150
  const col1X = MARGIN_X
  const col2X = MARGIN_X + lineLen + 30
  const col3X = MARGIN_X + lineLen * 2 + 60

  for (const row of rows) {
    if (y < MARGIN_BOTTOM + 20) break
    const lineY = y - 22
    page.drawLine({
      start: { x: col1X, y: lineY },
      end: { x: col1X + lineLen, y: lineY },
      thickness: 0.5,
      color: BLACK,
    })
    page.drawLine({
      start: { x: col2X, y: lineY },
      end: { x: col2X + lineLen, y: lineY },
      thickness: 0.5,
      color: BLACK,
    })
    page.drawLine({
      start: { x: col3X, y: lineY },
      end: { x: col3X + lineLen, y: lineY },
      thickness: 0.5,
      color: BLACK,
    })

    if (row.image) {
      const maxW = lineLen - 10
      const maxH = 50 // Larger final signature
      const ratio = Math.min(maxW / row.image.width, maxH / row.image.height)
      const w = row.image.width * ratio
      const h = row.image.height * ratio
      page.drawImage(row.image, {
        x: col1X + (lineLen - w) / 2,
        y: lineY - 5,
        width: w,
        height: h,
        opacity: 0.95,
      })
    }
    page.drawText(row.signedBy.toUpperCase(), {
      x: col2X + 4,
      y: lineY + 2,
      size: 10,
      font,
      color: BLACK,
    })
    page.drawText(f.date, {
      x: col3X + 4,
      y: lineY + 2,
      size: 10,
      font,
      color: BLACK,
    })

    page.drawText(row.label, { x: col1X, y: lineY - 13, size: 9, font, color: BLACK })
    page.drawText("Firmato da :", { x: col2X, y: lineY - 13, size: 9, font, color: BLACK })
    page.drawText("Data :", { x: col3X, y: lineY - 13, size: 9, font, color: BLACK })

    if (row.label === "Rivenditore" && otp) {
      const ts = new Date(otp.verifiedAtIso).toLocaleString("it-IT", {
        timeZone: "Europe/Rome",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      const otpFontSize = 6
      page.drawText(`${otp.retailerName}`, { x: col1X, y: lineY + 10, size: otpFontSize, font, color: MUTED })
      page.drawText(`OTP: ${ts} · ${otp.email}`, { x: col1X, y: lineY + 2, size: otpFontSize, font, color: MUTED })
    }

    y -= rowH
  }
}
