import { IncomingForm } from "formidable";
import fs from "fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error("FORMIDABLE ERROR:", err);
        return res.status(500).json({ error: "Error leyendo archivo" });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName) {
        return res.status(500).json({ error: "Falta CLOUDINARY_CLOUD_NAME" });
      }

      if (!uploadPreset) {
        return res
          .status(500)
          .json({ error: "Falta CLOUDINARY_UPLOAD_PRESET" });
      }

      const archivoBruto = files.file;
      const archivo = Array.isArray(archivoBruto)
        ? archivoBruto[0]
        : archivoBruto;

      if (!archivo || !archivo.filepath) {
        console.error("FILES RECIBIDOS:", files);
        return res.status(400).json({ error: "No llegó archivo válido" });
      }

      const buffer = await fs.readFile(archivo.filepath);
      const blob = new Blob([buffer], {
        type: archivo.mimetype || "image/png",
      });

      const formData = new FormData();
      formData.append(
        "file",
        blob,
        archivo.originalFilename || "cotizacion.png",
      );
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "cotizaciones");

      const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await upload.json();

      console.log("CLOUDINARY STATUS:", upload.status);
      console.log("CLOUDINARY RESP:", data);

      if (!upload.ok) {
        return res.status(upload.status).json({
          error: data?.error?.message || "Error subiendo a Cloudinary",
        });
      }

      return res.status(200).json({
        url: data.secure_url,
      });
    } catch (error) {
      console.error("UPLOAD ERROR:", error);
      return res.status(500).json({
        error: error.message || "Error interno en upload",
      });
    }
  });
}
