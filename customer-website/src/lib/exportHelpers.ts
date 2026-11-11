import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

function triggerBrowserDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function logDocumentExport(
  documentType: "resume" | "certificate",
  documentId: string,
  format: "pdf" | "png"
) {
  try {
    await fetch("/api/export/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType, documentId, format }),
    });
  } catch {
    // non-fatal telemetry failure
  }
}

export async function exportElementAsPng(
  node: HTMLElement,
  filename: string
): Promise<{ dataUrl: string; blob: Blob }> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2.5,
    cacheBust: true,
    filter: (domNode) =>
      !(domNode instanceof HTMLElement && domNode.dataset?.exportIgnore === "true"),
  });
  triggerBrowserDownload(dataUrl, filename);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { dataUrl, blob };
}

export async function exportElementAsA4Pdf(
  node: HTMLElement,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait"
): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2.5,
    cacheBust: true,
    filter: (domNode) =>
      !(domNode instanceof HTMLElement && domNode.dataset?.exportIgnore === "true"),
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed loading image for PDF rendering"));
  });

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  if (orientation === "landscape") {
    pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
  } else {
    const imgWidthMm = pageWidth;
    const imgHeightMm = (img.height * imgWidthMm) / img.width;

    let heightLeft = imgHeightMm;
    let position = 0;

    pdf.addImage(dataUrl, "PNG", 0, position, imgWidthMm, imgHeightMm, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 2) {
      position = heightLeft - imgHeightMm;
      pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, position, imgWidthMm, imgHeightMm, undefined, "FAST");
      heightLeft -= pageHeight;
    }
  }

  pdf.save(filename);
  return pdf.output("blob");
}
