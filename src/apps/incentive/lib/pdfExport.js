'use client';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const DESKTOP_WIDTH = 1024; // matches the statement's max-w-5xl content width; activates md: breakpoints

function waitForImages(container) {
  const imgs = Array.from(container.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          })
    )
  );
}

function copyComputedStyles(source, target) {
  const computed = window.getComputedStyle(source);
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed[index];
    if (property.startsWith("--")) continue;
    const value = computed.getPropertyValue(property);
    if (!value || /okl(ab|ch)|color-mix/i.test(value)) continue;
    target.style.setProperty(property, value);
  }

  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let index = 0; index < sourceChildren.length; index += 1) {
    copyComputedStyles(sourceChildren[index], targetChildren[index]);
  }
}

async function createCaptureDocument(container) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-100000px";
  iframe.style.top = "0";
  iframe.style.width = `${Math.max(DESKTOP_WIDTH, container.getBoundingClientRect().width)}px`;
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

  const clone = container.cloneNode(true);
  clone.style.width = "100%";
  copyComputedStyles(container, clone);
  captureDocument.body.appendChild(clone);
  iframe.style.height = `${Math.max(clone.scrollHeight, 1)}px`;
  await waitForImages(clone);

  return { iframe, captureDocument, clone };
}

function addCanvasToPdf(pdf, canvas, pageWidth, margin, usableHeight, firstPage) {
  const imageWidth = pageWidth - margin * 2;
  const pageSliceHeight = Math.max(1, Math.floor((canvas.width * usableHeight) / imageWidth));
  let offsetY = 0;
  let first = firstPage;

  while (offsetY < canvas.height) {
    const sliceHeight = Math.min(pageSliceHeight, canvas.height - offsetY);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const context = slice.getContext("2d");
    if (!context) throw new Error("Could not prepare a PDF page");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      slice.width,
      slice.height,
    );

    if (!first) pdf.addPage();
    first = false;
    const sliceHeightMm = (slice.height * imageWidth) / slice.width;
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imageWidth, sliceHeightMm);
    offsetY += sliceHeight;
  }

  return first;
}

export async function exportStatementPDF(container, retailerId, lang) {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableHeight = pageHeight - margin * 2;

  await waitForImages(container);
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const { iframe, captureDocument, clone } = await createCaptureDocument(container);
  try {
    const scale = Math.min(2, 30000 / Math.max(clone.scrollWidth, clone.scrollHeight, 1));
    const canvas = await html2canvas(clone, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: Math.max(DESKTOP_WIDTH, clone.clientWidth),
    });
    if (!canvas.width || !canvas.height) throw new Error("Statement rendered empty");
    addCanvasToPdf(pdf, canvas, pageWidth, margin, usableHeight, true);
  } finally {
    captureDocument.body.replaceChildren();
    iframe.remove();
  }

  // Page numbers
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      `${lang === "it" ? "Pagina" : "Page"} ${i} / ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - 4
    );
  }

  const safeId = String(retailerId || "retailer").replace(/[^a-zA-Z0-9-_~]/g, "");
  const filename =
    lang === "it"
      ? `Estratto_Incentivi_Rivenditore_${safeId}_IT.pdf`
      : `Retailer_Incentive_Statement_${safeId}_EN.pdf`;
  pdf.save(filename);
}