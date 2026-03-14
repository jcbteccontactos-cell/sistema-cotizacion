import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

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

    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 60000,
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

    return res.status(200).send(finalBuffer);
  } catch (error) {
    console.error("ERROR GENERANDO PDF:", error);
    return res.status(500).json({
      error: "No se pudo generar el PDF",
      detalle: error?.message || "Error desconocido",
      stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
