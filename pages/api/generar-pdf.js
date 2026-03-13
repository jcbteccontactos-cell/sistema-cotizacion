import puppeteer from "puppeteer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  let browser;

  try {
    const { html, numeroCotizacion } = req.body || {};

    if (!html) {
      return res.status(400).json({ error: "Falta html" });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.emulateMediaType("print");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
    });

    const finalBuffer = Buffer.from(pdfBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${numeroCotizacion || "cotizacion"}.pdf"`,
    );
    res.setHeader("Content-Length", finalBuffer.length);

    return res.status(200).end(finalBuffer);
  } catch (error) {
    console.error("ERROR GENERANDO PDF:", error);
    return res.status(500).json({
      error: "No se pudo generar el PDF",
      detalle: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
