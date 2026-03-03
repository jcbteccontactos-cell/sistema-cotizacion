import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
);

export default async function handler(req, res) {
  try {
    // ===== GET: listar productos =====
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error)
        return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, products: data });
    }

    // ===== POST: crear producto =====
    if (req.method === "POST") {
      const p = req.body || {};
      if (!p.nombre)
        return res.status(400).json({ ok: false, error: "Falta nombre" });

      const { error } = await supabase.from("products").insert([
        {
          categoria: p.categoria || "pc",
          nombre: String(p.nombre),
          marca: p.marca ?? "N/D",
          modelo: p.modelo ?? "N/D",
          precio: Number(p.precio || 0),
          detalles: Array.isArray(p.detalles) ? p.detalles : [],
        },
      ]);

      if (error)
        return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // ===== PUT: editar producto =====
    if (req.method === "PUT") {
      const p = req.body || {};
      if (!p.id) return res.status(400).json({ ok: false, error: "Falta id" });

      const { error } = await supabase
        .from("products")
        .update({
          categoria: p.categoria || "pc",
          nombre: String(p.nombre || ""),
          marca: p.marca ?? "N/D",
          modelo: p.modelo ?? "N/D",
          precio: Number(p.precio || 0),
          detalles: Array.isArray(p.detalles) ? p.detalles : [],
        })
        .eq("id", p.id);

      if (error)
        return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // ===== DELETE: eliminar producto =====
    if (req.method === "DELETE") {
      const id = req.query?.id;
      if (!id) return res.status(400).json({ ok: false, error: "Falta id" });

      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error)
        return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // ===== Método no soportado =====
    return res.status(405).json({
      ok: false,
      error: `Método no soportado: ${req.method}`,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
