import cloudinary from "../../lib/cloudinary";

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

  try {
    const { image, fileName } = req.body;

    const safeName = String(fileName || `cotizacion-${Date.now()}`)
      .trim()
      .replace(/\.[^/.]+$/, "")
      .replace(/[^\w\-]/g, "-");

    const result = await cloudinary.uploader.upload(image, {
      folder: "cotizaciones",
      public_id: safeName,
      overwrite: true,
      resource_type: "image",
    });

    return res.status(200).json({
      ok: true,
      url: result.secure_url,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      error: "Error subiendo imagen",
    });
  }
}
