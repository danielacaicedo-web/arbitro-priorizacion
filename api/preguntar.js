// Vercel serverless function — responde preguntas de seguimiento del PM sobre una evaluación ya hecha.

const SYSTEM = `Eres un auditor de iniciativas de producto en Spin. Evalúas qué tan sólida está la sustentación de una iniciativa. NO decides si debe hacerse ni la priorizas.
Hablas en español neutro y cercano, sin tecnicismos. Eres exigente, no complaciente.`;

const MODEL = process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { criterios, pregunta } = req.body || {};
  if (!pregunta || typeof pregunta !== "string") {
    res.status(400).json({ error: "falta_pregunta" });
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
          { role: "system", content: SYSTEM + " Ahora el PM te está preguntando algo sobre tu evaluación. Responde en dos o tres frases, en español llano, sin JSON. No escribas la iniciativa por él." },
          { role: "user", content: "EVALUACIÓN:\n" + JSON.stringify(criterios || []) + "\n\nPREGUNTA DEL PM: " + pregunta },
        ],
      }),
    });

    if (!r.ok) {
      res.status(502).json({ error: "sin_respuesta_modelo" });
      return;
    }

    const d = await r.json();
    const respuesta = d.choices?.[0]?.message?.content || "";
    res.status(200).json({ respuesta: respuesta.trim() });
  } catch (e) {
    res.status(500).json({ error: "fallo_respuesta", detalle: String(e) });
  }
}
