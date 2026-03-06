// /pages/api/doc.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { doc } = req.body || {};
    const clean = String(doc || "").replace(/\D/g, ""); // solo números

    // Perú: DNI = 8 dígitos, RUC = 11 dígitos
    const isDni = clean.length === 8;
    const isRuc = clean.length === 11;

    if (!isDni && !isRuc) {
      return res.status(400).json({
        ok: false,
        error: "Documento inválido. DNI(8) o RUC(11).",
      });
    }

    const token = process.env.JSONPE_TOKEN;
    if (!token) {
      return res.status(500).json({
        ok: false,
        error: "Falta JSONPE_TOKEN en .env.local",
      });
    }

    const url = isDni
      ? "https://api.json.pe/api/dni"
      : "https://api.json.pe/api/ruc";
    const payload = isDni ? { dni: clean } : { ruc: clean };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data || data.success !== true) {
      return res.status(resp.status || 500).json({
        ok: false,
        error: data?.message || "Error consultando json.pe",
        raw: data || null,
      });
    }

    // Normalizamos un "nombre" para tu input Cliente
    let nombre = "";
    let direccion = "";

    if (isDni) {
      nombre = data?.data?.nombre_completo || "";
      direccion = data?.data?.direccion_completa || data?.data?.direccion || "";
    } else {
      nombre = data?.data?.nombre_o_razon_social || "";
      direccion = data?.data?.direccion_completa || data?.data?.direccion || "";
    }

    return res.status(200).json({
      ok: true,
      tipo: isDni ? "dni" : "ruc",
      doc: clean,
      nombre,
      direccion,
      raw: data.data,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Error interno",
    });
  }
}
