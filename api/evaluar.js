// Vercel serverless function — evalúa una iniciativa con un modelo vía OpenRouter.
// La API key nunca llega al cliente: vive en la variable de entorno OPENROUTER_API_KEY.

const SYSTEM = `Eres un auditor de iniciativas de producto en Spin. Evalúas qué tan sólida está la sustentación de una iniciativa. NO decides si debe hacerse ni la priorizas.
Para cada uno de los seis criterios (Alineación, Origen, Impacto medible, Apetito, Dependencias, Repetición) devuelve estado (sustentado, débil o ausente), la FRASE TEXTUAL del documento que lo respalda y una nota de máximo 12 palabras.
REGLA DURA: sin frase que citar, el criterio no puede quedar sustentado.
Si faltan problema, usuario u objetivo de negocio, marca no_evaluable.
Hablas en español neutro y cercano, sin tecnicismos. Eres exigente, no complaciente.
Respondes SIEMPRE solo con JSON válido, sin markdown.`;

const MODEL = process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { txt, corpus } = req.body || {};
  if (!txt || typeof txt !== "string") {
    res.status(400).json({ error: "falta_txt" });
    return;
  }

  const corpusTxt = Array.isArray(corpus)
    ? corpus.map(i => `${i.id} | ${i.squad} | ${i.nombre} | ${i.objetivo}`).join("\n")
    : "";

  const prompt = `Evalúa esta iniciativa. JSON:
{"no_evaluable":bool,"minimos_faltantes":[],"criterios":[{"id":"c1","nombre":"Alineación","estado":"","cita":"","nota":""}],"preguntas":[{"id":"p1","criterio":"c3","origen":"generada","texto":""}],"dependencias":[{"tipo":"","iniciativa":"","squad":"","nota":""}],"cobertura":""}
Entre 3 y 5 preguntas, solo para criterios débiles o ausentes.
INICIATIVAS DECLARADAS:
${corpusTxt}
DOCUMENTO:
${txt}`;

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1400,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      const detalle = await r.text();
      res.status(502).json({ error: "sin_respuesta_modelo", detalle });
      return;
    }

    const d = await r.json();
    const t = d.choices?.[0]?.message?.content || "";
    const limpio = t.replace(/```json|```/g, "").trim();
    const json = JSON.parse(limpio.slice(limpio.indexOf("{"), limpio.lastIndexOf("}") + 1));
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: "fallo_evaluacion", detalle: String(e) });
  }
}
