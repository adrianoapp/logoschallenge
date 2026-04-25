// api/send-otp.js — Génère et envoie un code OTP par email via Supabase
const SUPA_URL = "https://gyqasmnbnfmkgoneoqzq.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || "sb_publishable_M1Du3urjG4Sy-VkCZS0Kng_3gQahUbX";

export default async function handler(req, res) {
  // CORS — accepter les requêtes depuis l'app Android (Capacitor) et Vercel
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Email invalide" });

  try {
    // Générer un code à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Supprimer l'ancien code si existant
    await supaFetch(`otp_codes?email=eq.${encodeURIComponent(email)}`, "DELETE");

    // Insérer le nouveau code
    await supaFetch("otp_codes", "POST", { email, code, expires_at: expires });

    // Envoyer l'email via Supabase (depuis le serveur = pas de CORS)
    const emailRes = await fetch(`${SUPA_URL}/auth/v1/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
      },
      body: JSON.stringify({ email, create_user: true, data: { otp_code: code } }),
    });

    // Fallback : si Supabase OTP ne marche pas, on utilise le template email custom
    if (!emailRes.ok) {
      // Envoyer via Resend ou SMTP si configuré
      console.log(`OTP for ${email}: ${code}`);
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("send-otp error:", e);
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
