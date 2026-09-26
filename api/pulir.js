// Vercel serverless function — asistente de redacción: pule la forma de lo que el PM
// escribe para fortalecer un criterio, sin cambiar el fondo (ver backlog).

const SYSTEM = `Eres un asistente de redacción para PMs de Spin. Te pasan un texto escrito de forma casual o desordenada, en el que cuentan algo de su iniciativa.
Tu única tarea es pulir la forma: corrige ortografía y errores de tipeo, mejora gramática, claridad y orden de las ideas.
No agregues datos, cifras, ejemplos ni ideas que no estén ya en el texto. No cambies el significado ni el alcance de lo que dice. No lo hagas más largo de lo necesario.
Si el texto ya está bien escrito y sin errores, devuélvelo tal cual, sin cambios artificiales solo por cambiar algo.
Responde en español neutro, SOLO con el texto pulido — sin comillas, sin comentarios, sin explicar qué cambiaste.`;

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
        max_tokens: 400,
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
    const texto = d.choices?.[0]?.message?.content || "";
    res.status(200).json({ texto: texto.trim() });
  } catch (e) {
    res.status(500).json({ error: "fallo_pulido", detalle: String(e) });
  }
}
