export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { query } = req.body || {};
    const GEMINI_KEY = process.env.GEMINI_KEY;

    console.log("POST /api/gemini query:", query);

    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: "Falta query" });
    }

    if (!GEMINI_KEY) {
      return res.status(500).json({ error: "Falta GEMINI_KEY" });
    }

    const prompt = `
Eres un verificador de productos EXACTOS.

OBJETIVO:
Encontrar el producto exacto solicitado por nombre/modelo/código.
Si no existe coincidencia exacta, NO inventes datos y NO uses productos similares.

PEDIDO DEL USUARIO:
${query}

PRIORIDAD:
1. Buscar primero en https://www.deltron.com.pe/index_2.php
2. Si no aparece ahí, buscar en otras fuentes confiables
3. Priorizar ficha oficial del fabricante o distribuidor confiable
4. Si hay conflicto entre fuentes, priorizar la fuente que muestre el código/modelo exacto

REGLAS CRÍTICAS:
- El modelo/código debe coincidir exactamente
- Si el producto encontrado no coincide exactamente, exact_match debe ser false
- No confundas variantes (i5 vs i7, 8GB vs 16GB, etc.)
- No completes campos con suposiciones
- Si el producto es un componente suelto (CPU, GPU, RAM, SSD), usa categoria "pc"
- Si te pido que busques algo y no soy muy especifico, asume poner modelos similares
Devuelve SOLO JSON válido, sin explicación, sin markdown.

Formato exacto:
{
  "exact_match": true,
  "categoria": "",
  "nombre": "",
  "marca": "",
  "modelo": "",
  "precio_sugerido": 0,
  "detalles": [],
  "source_url": "",
  "source_name": ""
}

Si NO hay coincidencia exacta:
{
  "exact_match": false,
  "categoria": "",
  "nombre": "",
  "marca": "",
  "modelo": "",
  "precio_sugerido": 0,
  "detalles": [],
  "source_url": "",
  "source_name": ""
}
`;

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          tools: [
            {
              google_search: {},
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        }),
      },
    );

    const data = await r.json();
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));

    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error?.message || "Error consultando Gemini",
      });
    }

    const raw =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "";

    const cleaned = limpiarJSON(raw);
    console.log("Gemini cleaned JSON:", cleaned);

    try {
      const parsed = JSON.parse(cleaned);

      const exactMatch = Boolean(parsed?.exact_match);

      if (!exactMatch) {
        return res.status(200).json({
          exact_match: false,
          categoria: "",
          nombre: "",
          marca: "",
          modelo: "",
          precio_sugerido: 0,
          detalles: [],
          source_url: "",
          source_name: "",
        });
      }

      return res.status(200).json({
        exact_match: true,
        categoria: normalizarCategoria(parsed?.categoria),
        nombre: String(parsed?.nombre || "").trim(),
        marca: String(parsed?.marca || "").trim(),
        modelo: String(parsed?.modelo || "").trim(),
        precio_sugerido: Number(parsed?.precio_sugerido || 0),
        detalles: Array.isArray(parsed?.detalles)
          ? parsed.detalles.map((x) => String(x).trim()).filter(Boolean)
          : [],
        source_url: String(parsed?.source_url || "").trim(),
        source_name: String(parsed?.source_name || "").trim(),
      });
    } catch (e) {
      console.error("JSON parse error:", e);
      return res.status(200).json({
        exact_match: false,
        categoria: "",
        nombre: "",
        marca: "",
        modelo: "",
        precio_sugerido: 0,
        detalles: [],
        source_url: "",
        source_name: "",
      });
    }
  } catch (error) {
    console.error("API /api/gemini fatal error:", error);
    return res.status(500).json({
      error: error?.message || "Error interno",
    });
  }
}

function limpiarJSON(texto) {
  let t = String(texto || "").trim();
  t = t.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  t = t.replace(/\s*```$/i, "");

  const ini = t.indexOf("{");
  const fin = t.lastIndexOf("}");

  if (ini !== -1 && fin !== -1) {
    t = t.slice(ini, fin + 1);
  }

  return t;
}

function normalizarCategoria(cat) {
  const c = String(cat || "").toLowerCase();

  if (c.includes("laptop")) return "laptop";
  if (c.includes("cam")) return "camara";
  return "pc";
}
