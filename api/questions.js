export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch(e) {}
  }
  const levelId = body?.levelId || 1;
  const alreadyAsked = body?.alreadyAsked || [];
  const count = body?.count || 5;

  const LEVEL_PROMPTS = {
    1: "questions très faciles sur la Bible pour débutants : noms des livres, personnages très connus (Noé, Abraham, Moïse, Jésus), événements majeurs. Niveau primaire.",
    2: "questions faciles sur les personnages bibliques, leurs familles, leurs actions principales. Ancien et Nouveau Testament. Niveau collège.",
    3: "questions intermédiaires sur le Nouveau Testament : les apôtres, les paraboles, les miracles, la vie de Jésus, les épîtres de Paul. Niveau lycée.",
    4: "questions difficiles sur les prophètes (Ésaïe, Jérémie, Ézéchiel, Daniel), les visions prophétiques, l'Apocalypse. Niveau universitaire.",
    5: "questions très difficiles sur la théologie biblique, les langues originales (hébreu, grec), les termes théologiques. Niveau expert.",
    6: "questions d'expert sur l'exégèse biblique, les manuscrits anciens, les canons bibliques, la chronologie précise. Niveau maître.",
  };

  const avoidList = alreadyAsked.length > 0
    ? "\n\nÉVITE ces sujets déjà posés :\n" + alreadyAsked.slice(-20).map((q, i) => (i+1) + ". " + q).join("\n")
    : "";
gemini-2.0-flash
  const prompt = `Tu es un expert de la Bible. Génère exactement ${count} questions de quiz bibliques en français. Niveau : ${LEVEL_PROMPTS[levelId]}${avoidList}

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ou après, sans backticks, sans markdown :
[{"q":"Question ?","opts":["A","B","C","D"],"a":0,"exp":"Explication (Référence).","topic":"sujet"}]

"a" = index de la bonne réponse (0, 1, 2 ou 3). Génère exactement ${count} objets dans le tableau.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: "Gemini API error", detail: JSON.stringify(data) });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      return res.status(500).json({ error: "Réponse vide de Gemini", detail: JSON.stringify(data) });
    }

    const clean = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(clean);
    return res.status(200).json({ questions });

  } catch (err) {
    return res.status(500).json({ error: "Erreur génération questions", detail: err.message });
  }
}
