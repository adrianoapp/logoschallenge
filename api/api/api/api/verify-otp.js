// api/verify-otp.js — Vérifie le code OTP saisi par l'utilisateur
const SUPA_URL = "https://gyqasmnbnfmkgoneoqzq.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || "sb_publishable_M1Du3urjG4Sy-VkCZS0Kng_3gQahUbX";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Paramètres manquants" });

  try {
    // Chercher le code en base
    const rows = await supaFetch(`otp_codes?email=eq.${encodeURIComponent(email)}&select=*`);

    if (!rows || rows.length === 0) {
      return res.status(200).json({ valid: false, reason: "no_code" });
    }

    const row = rows[0];

    // Vérifier expiration
    if (new Date(row.expires_at) < new Date()) {
      await supaFetch(`otp_codes?email=eq.${encodeURIComponent(email)}`, "DELETE");
      return res.status(200).json({ valid: false, reason: "expired" });
    }

    // Vérifier le code
    if (row.code !== code.trim()) {
      return res.status(200).json({ valid: false, reason: "wrong_code" });
    }

    // Code correct — supprimer après usage (usage unique)
    await supaFetch(`otp_codes?email=eq.${encodeURIComponent(email)}`, "DELETE");

    return res.status(200).json({ valid: true });
  } catch (e) {
    console.error("verify-otp error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

async function supaFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Prefer": "return=representation",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  try { return await r.json(); } catch(e) { return r.ok; }
}
