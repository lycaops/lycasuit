'use client';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const DESKTOP_WIDTH = 1024;

function waitForImages(container) {
  return Promise.all(
    Array.from(container.querySelectorAll("img")).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          }),
    ),
  );
}

function copyComputedStyles(source, target) {
  const computed = window.getComputedStyle(source);
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed[index];
    if (property.startsWith("--")) continue;
    const value = computed.getPropertyValue(property);
    if (!value || /\b(?:oklab|oklch|lab|lch|color-mix)\s*\(/i.test(value)) continue;
    target.style.setProperty(property, value);
  }

  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let index = 0; index < sourceChildren.length; index += 1) {
    copyComputedStyles(sourceChildren[index], targetChildren[index]);
  }
}

function restoreTableOutlines(source, target) {
  const sourceTables = source.querySelectorAll("table");
  const targetTables = target.querySelectorAll("table");

  for (let index = 0; index < sourceTables.length; index += 1) {
    const sourceTable = sourceTables[index];
    const targetTable = targetTables[index];
    if (!targetTable) continue;

    targetTable.style.setProperty("border-collapse", "collapse");
    targetTable.style.setProperty("border-spacing", "0");
    targetTable.style.setProperty("width", getComputedStyle(sourceTable).width);
    targetTable.style.setProperty("table-layout", getComputedStyle(sourceTable).tableLayout || "auto");
    targetTable.style.setProperty("border", "1px solid #e2e8f0");

    targetTable.querySelectorAll("thead").forEach((head) => {
      head.style.setProperty("background-color", "#f8fafc");
    });
    targetTable.querySelectorAll("tbody tr").forEach((row) => {
      row.style.setProperty("border-top", "1px solid #f1f5f9");
    });
    targetTable.querySelectorAll("th, td").forEach((cell) => {
      cell.style.setProperty("border-color", "#f1f5f9");
      cell.style.setProperty("border-style", "solid");
      cell.style.setProperty("border-width", "0");
    });
  }
}

function restoreStatementPalette(target) {
  target.querySelectorAll("*").forEach((element) => {
    const classes = typeof element.className === "string" ? element.className : "";
    if (classes.includes("border-slate-200")) {
      element.style.setProperty("border-color", "#e2e8f0");
    }
    if (classes.includes("border-slate-100")) {
      element.style.setProperty("border-color", "#f1f5f9");
    }
    if (classes.includes("bg-slate-50")) {
      element.style.setProperty("background-color", "#f8fafc");
    }
  });
}

async function createCaptureDocument(source) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-100000px";
  iframe.style.top = "0";
  iframe.style.width = `${Math.max(DESKTOP_WIDTH, source.getBoundingClientRect().width)}px`;
  iframe.style.height = "1px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const captureDocument = iframe.contentDocument;
  captureDocument.open();
  captureDocument.write("<!doctype html><html><head></head><body></body></html>");
  captureDocument.close();
  captureDocument.body.style.margin = "0";
  captureDocument.body.style.padding = "0";
  captureDocument.body.style.background = "#ffffff";

  const clone = source.cloneNode(true);
  clone.style.width = `${Math.max(1, source.getBoundingClientRect().width)}px`;
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  copyComputedStyles(source, clone);
  restoreStatementPalette(clone);
  restoreTableOutlines(source, clone);
  captureDocument.body.appendChild(clone);
  iframe.style.height = `${Math.max(clone.scrollHeight, 1)}px`;
  await waitForImages(clone);

  return { iframe, captureDocument, clone };
}

async function renderPage(source) {
  const { iframe, captureDocument, clone } = await createCaptureDocument(source);
  try {
    const scale = Math.min(2, 24000 / Math.max(clone.scrollWidth, clone.scrollHeight, 1));
    const canvas = await html2canvas(clone, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: Math.max(DESKTOP_WIDTH, clone.clientWidth),
    });
    if (!canvas.width || !canvas.height) throw new Error("Statement page rendered empty");
    return canvas;
  } finally {
    captureDocument.body.replaceChildren();
    iframe.remove();
  }
}

function addPageCanvas(pdf, canvas, pageWidth, pageHeight, margin) {
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = pageHeight - margin * 2;
  const ratio = Math.min(imageWidth / canvas.width, imageHeight / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    (pageWidth - width) / 2,
    margin,
    width,
    height,
  );
}

export async function exportStatementPDF(container, retailerId, lang) {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;

  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const pages = Array.from(container.querySelectorAll("[data-pdf-section]"));
  if (pages.length !== 4) {
    throw new Error(`Expected 4 statement pages, found ${pages.length}`);
  }

  for (let index = 0; index < pages.length; index += 1) {
    if (index > 0) pdf.addPage();
    const canvas = await renderPage(pages[index]);
    addPageCanvas(pdf, canvas, pageWidth, pageHeight, margin);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      `${lang === "it" ? "Pagina" : "Page"} ${index + 1} / ${pages.length}`,
      pageWidth - margin - 20,
      pageHeight - 4,
    );
  }

  const safeId = String(retailerId || "retailer").replace(/[^a-zA-Z0-9-_~]/g, "");
  const filename =
    lang === "it"
      ? `Estratto_Incentivi_Rivenditore_${safeId}_IT.pdf`
      : `Retailer_Incentive_Statement_${safeId}_EN.pdf`;
  pdf.save(filename);
}
