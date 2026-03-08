
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { levelId, alreadyAsked = [], count = 5 } = req.body;

  const LEVEL_PROMPTS = {
    1: "questions très faciles sur la Bible pour débutants : noms des livres, personnages très connus (Noé, Abraham, Moïse, Jésus), événements majeurs. Niveau primaire.",
    2: "questions faciles sur les personnages bibliques, leurs familles, leurs actions principales. Ancien et Nouveau Testament. Niveau collège.",
    3: "questions intermédiaires sur le Nouveau Testament : les apôtres, les paraboles, les miracles, la vie de Jésus, les épîtres de Paul. Niveau lycée.",
    4: "questions difficiles sur les prophètes (Ésaïe, Jérémie, Ézéchiel, Daniel), les visions prophétiques, l'Apocalypse, les livres poétiques. Niveau universitaire.",
    5: "questions très difficiles sur la théologie biblique, les langues originales (hébreu, grec), les termes théologiques (shékinah, koinè, Septante). Niveau expert.",
    6: "questions d'expert sur l'exégèse biblique, les manuscrits anciens, les canons bibliques, la géographie biblique détaillée, la chronologie précise. Niveau maître.",
  };

  const avoidList = alreadyAsked.length > 0
    ? "\n\nÉVITE ABSOLUMENT ces sujets déjà posés :\n" + alreadyAsked.slice(-30).map((q, i) => (i+1) + ". " + q).join("\n")
    : "";

  const prompt = `Tu es un expert de la Bible. Génère exactement ${count} questions de quiz bibliques originales en français.\n\nNiveau : ${LEVEL_PROMPTS[levelId]}${avoidList}\n\nRÈGLES STRICTES :\n- Chaque question doit être UNIQUE et différente des précédentes\n- 4 options de réponse (une seule bonne réponse)\n- La bonne réponse doit être clairement correcte et vérifiable dans la Bible\n- Les mauvaises réponses doivent être plausibles mais clairement fausses\n- Inclure la référence biblique dans l'explication\n- Varier les livres bibliques (AT et NT), les thèmes, les personnages\n\nRéponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ou après, sans backticks :\n[\n  {\n    "q": "Texte de la question ?",\n    "opts": ["Option A", "Option B", "Option C", "Option D"],\n    "a": 0,\n    "exp": "Explication avec référence biblique (Livre chapitre:verset).",\n    "topic": "sujet court"\n  }\n]\n\nL'index "a" est la position de la bonne réponse dans "opts" (0, 1, 2 ou 3).`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1500 },
      }),
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(clean);
    return res.status(200).json({ questions });

  } catch (err) {
    return res.status(500).json({ error: "Erreur génération questions", detail: err.message });
  }
}
