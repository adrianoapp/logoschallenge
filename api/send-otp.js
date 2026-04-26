// api/send-otp.js — Génère un code OTP, le sauvegarde et l'envoie par email via Resend
const SUPA_URL = "https://gyqasmnbnfmkgoneoqzq.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || "sb_publishable_M1Du3urjG4Sy-VkCZS0Kng_3gQahUbX";
const RESEND_KEY = process.env.RESEND_API_KEY; // À configurer dans Vercel

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body || {};
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Email invalide" });

  try {
    // 1. Générer un code à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 2. Sauvegarder dans otp_codes (upsert)
    await supaFetch(`otp_codes?email=eq.${encodeURIComponent(email)}`, "DELETE");
    const saved = await supaFetch("otp_codes", "POST", { email, code, expires_at: expires });
    console.log("OTP saved:", saved);

    // 3. Envoyer l'email avec Resend
    if (RESEND_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from: "LogosChallenge <noreply@logoschallenge.vercel.app>",
          to: [email],
          subject: `LogosChallenge — Code : ${code}`,
          html: `
            <div style="font-family:Arial,sans-serif;background:#0f172a;color:white;padding:40px;text-align:center;border-radius:12px;">
              <div style="font-size:40px;margin-bottom:12px;">✝️</div>
              <h2 style="color:#FFD700;margin-bottom:8px;">LogosChallenge</h2>
              <p style="color:#888;margin-bottom:24px;">Votre code de connexion :</p>
              <div style="font-size:42px;font-weight:bold;letter-spacing:12px;color:#63CAB7;font-family:monospace;background:rgba(99,202,183,0.1);padding:20px;border-radius:10px;margin-bottom:24px;">
                ${code}
              </div>
              <p style="color:#666;font-size:13px;">Ce code expire dans 10 minutes.<br>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
            </div>
          `,
        }),
      });
      if (!emailRes.ok) {
        const err = await emailRes.json().catch(() => ({}));
        console.error("Resend error:", err);
        // Ne pas bloquer — le code est quand même sauvegardé
      }
    } else {
      // Pas de Resend configuré — log le code (dev seulement)
      console.log(`OTP CODE for ${email}: ${code}`);
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("send-otp error:", e);
    return res.status(500).json({ error: "Erreur serveur: " + e.message });
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
  try { return await r.json(); } catch(e) { return null; }
}
