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
  const levelId      = body?.levelId || 1;
  const alreadyAsked = body?.alreadyAsked || [];
  const count        = body?.count || 5;
  const lang         = body?.lang || "fr";

  const LEVEL_PROMPTS_FR = {
    1: "questions très faciles sur la Bible pour débutants : noms des livres, personnages très connus (Noé, Abraham, Moïse, Jésus), événements majeurs. Niveau primaire.",
    2: "questions faciles sur les personnages bibliques, leurs familles, leurs actions principales. Ancien et Nouveau Testament. Niveau collège.",
    3: "questions intermédiaires sur le Nouveau Testament : les apôtres, les paraboles, les miracles, la vie de Jésus, les épîtres de Paul. Niveau lycée.",
    4: "questions difficiles sur les prophètes (Ésaïe, Jérémie, Ézéchiel, Daniel), les visions prophétiques, l'Apocalypse. Niveau universitaire.",
    5: "questions très difficiles sur la théologie biblique, les langues originales (hébreu, grec), les termes théologiques. Niveau expert.",
    6: "questions d'expert sur l'exégèse biblique, les manuscrits anciens, les canons bibliques, la chronologie précise. Niveau maître.",
  };

  const LEVEL_PROMPTS_EN = {
    1: "very easy Bible questions for beginners: names of books, well-known characters (Noah, Abraham, Moses, Jesus), major events like creation, the flood, the nativity. Elementary level.",
    2: "easy questions about biblical characters, their families, their main actions. Old and New Testament. Middle school level.",
    3: "intermediate questions about the New Testament: the apostles, parables, miracles, the life of Jesus, Paul's epistles. High school level.",
    4: "difficult questions about the prophets (Isaiah, Jeremiah, Ezekiel, Daniel), prophetic visions, Revelation. University level.",
    5: "very difficult questions about biblical theology, original languages (Hebrew, Greek), theological terms (Shekinah, koine, Septuagint). Expert level.",
    6: "expert questions about biblical exegesis, ancient manuscripts, biblical canons, precise chronology, typological links between OT and NT. Master level.",
  };

  const prompts = lang === "en" ? LEVEL_PROMPTS_EN : LEVEL_PROMPTS_FR;

  const avoidList = alreadyAsked.length > 0
    ? (lang === "en"
        ? "\n\nAVOID these topics already asked:\n"
        : "\n\nÉVITE ces sujets déjà posés :\n") +
      alreadyAsked.slice(-20).map((q, i) => (i+1) + ". " + q).join("\n")
    : "";

  const prompt = lang === "en"
    ? `You are a Bible expert. Generate exactly ${count} Bible quiz questions in English. Level: ${prompts[levelId]}${avoidList}\n\nRespond ONLY with a valid JSON array, no text before or after, no backticks, no markdown:\n[{"q":"Question?","opts":["A","B","C","D"],"a":0,"exp":"Explanation (Reference).","topic":"topic"}]\n\n"a" = index of the correct answer (0, 1, 2 or 3). Generate exactly ${count} objects in the array.`
    : `Tu es un expert de la Bible. Génère exactement ${count} questions de quiz bibliques en français. Niveau : ${prompts[levelId]}${avoidList}\n\nRéponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ou après, sans backticks, sans markdown :\n[{"q":"Question ?","opts":["A","B","C","D"],"a":0,"exp":"Explication (Référence).","topic":"sujet"}]\n\n"a" = index de la bonne réponse (0, 1, 2 ou 3). Génère exactement ${count} objets dans le tableau.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://logoschallenge.vercel.app",
        "X-Title": "LogosChallenge",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: "OpenRouter error", detail: JSON.stringify(data) });

    const text = data.choices?.[0]?.message?.content || "";
    if (!text) return res.status(500).json({ error: "Empty response", detail: JSON.stringify(data) });

    const clean = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(clean);
    return res.status(200).json({ questions });

  } catch (err) {
    return res.status(500).json({ error: "Question generation error", detail: err.message });
  }
}
