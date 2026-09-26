// Vercel serverless function — genera un resumen corto de una iniciativa para el
// panel lateral (reemplaza mostrar el texto crudo, ver Epic 7.11).

const SYSTEM = `Resumes iniciativas de producto de Spin para un panel lateral, en español claro y neutro, sin opinar ni evaluar.
Devuelve EXACTAMENTE entre 3 y 5 líneas, cada una un bullet independiente que empieza con "- ", sin encabezados, sin numeración y sin texto antes o después de los bullets.
Cada bullet debe ser corto (máximo 20 palabras) y cubrir, en este orden si están presentes en el texto: qué es la iniciativa, qué problema ataca y para quién, cómo funciona o su mecanismo propuesto, el impacto o cifra esperada si la hay.
No inventes datos que no estén en el texto. No repitas la misma idea en dos bullets.`;

const MODEL = process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { txt } = req.body || {};
  if (!txt || typeof txt !== "string") {
    res.status(400).json({ error: "falta_txt" });
    return;
  }

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 220,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: txt },
        ],
      }),
    });

    if (!r.ok) {
      res.status(502).json({ error: "sin_respuesta_modelo" });
      return;
    }

    const d = await r.json();
    const resumen = d.choices?.[0]?.message?.content || "";
    res.status(200).json({ resumen: resumen.trim() });
  } catch (e) {
    res.status(500).json({ error: "fallo_resumen", detalle: String(e) });
  }
}
