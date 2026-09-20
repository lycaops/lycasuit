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

export async function exportStatementPDF(container, retailerId, lang) {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const sections = Array.from(container.querySelectorAll("[data-pdf-section]"));
  if (sections.length === 0) throw new Error("No statement sections were found for PDF export");

  await waitForImages(container);
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  let first = true;
  for (const section of sections) {
    const captureOptions = {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: Math.max(DESKTOP_WIDTH, document.documentElement.clientWidth),
    };
    let canvas;
    try {
      canvas = await html2canvas(section, { ...captureOptions, foreignObjectRendering: true });
    } catch (foreignObjectError) {
      console.warn("Native statement capture failed; retrying canvas capture", foreignObjectError);
      canvas = await html2canvas(section, captureOptions);
    }
    const imgData = canvas.toDataURL("image/jpeg", 0.8);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (!first) pdf.addPage();
    first = false;

    if (imgHeight <= usableHeight) {
      pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
        heightLeft -= usableHeight;
      }
    }
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