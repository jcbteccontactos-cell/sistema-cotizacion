import chromium from "@sparticuz/chromium-min";
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

    const executablePath = await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar",
    );

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
    res.setHeader("Content-Length", finalBuffer.length);

    return res.status(200).send(finalBuffer);
  } catch (error) {
    console.error("ERROR GENERANDO PDF:", error);
    return res
      .status(500)
      .send("ERROR PDF: " + (error?.message || "Error desconocido"));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
