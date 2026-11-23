// Snow Cloud Chek — Check-Ban (Cloudflare Pages Function), v2.
// - Reprises automatiques (429 / 5xx / coupure / réveil de Render) avec attente progressive
// - Cache court des résultats définitifs (évite de re-solliciter l'API pour le même numéro)
// - Gains : 0,15 USD (actif) / 0,25 USD (banni), calculés ICI côté serveur (jamais côté navigateur)
//
// Variables Cloudflare (Pages > Paramètres > Variables) :
//   SB_SERVICE_KEY   (secret, facultatif) clé « service_role » de Supabase — sans elle, le check marche mais ne rapporte rien
//   SB_URL           (facultatif) URL Supabase, défaut = ton projet
//   BANCHECK_API_URL (facultatif) une ou plusieurs URL d'API séparées par des virgules (secours automatique)

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULT_SB_URL = "https://gphuehehyerrjzeiqrmk.supabase.co";
const DEFAULT_API = "https://inconnu-check-ban-api.onrender.com";

function normalizeNumber(v) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length < 8 || d.length > 15) throw new Error("Numéro invalide : format international requis.");
  return "+" + d;
}

function interpretBanStatus(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Réponse invalide du service.");
  if (raw.error) throw new Error(String(raw.error));
  const reason = typeof raw.reason === "string" ? raw.reason : "";
  if (raw.banned === true) return { banned: true, status: "banned", reason };
  if (raw.banned === false) return { banned: false, status: "not_banned", reason };
  return { banned: null, status: "undetermined", reason };
}

const bases = (env) => String(env.BANCHECK_API_URL || DEFAULT_API).split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
const isTimeout = (e) => e && (e.name === "TimeoutError" || e.name === "AbortError");

function friendly(status, err) {
  if (status === 429) return "Le service de vérification est saturé. Réessaie dans quelques secondes.";
  if (err === "timeout" || status === 502 || status === 503 || status === 504) return "Le service de vérification se réveille. Réessaie dans quelques secondes.";
  return "Le service de vérification est momentanément indisponible. Réessaie dans un instant.";
}

// Appelle l'API avec reprises. Renvoie { data } ou { error }.
async function callUpstream(env, number) {
  const list = bases(env);
  const budget = Math.max(3000, Math.min(Number(env.BANCHECK_BUDGET_MS) || 48000, 55000));
  const perTry = Math.max(1000, Math.min(Number(env.BANCHECK_TIMEOUT_MS) || 20000, 30000));
  const backoff = Math.max(1, Number(env.BANCHECK_BACKOFF_MS) || 1200);
  const minLeft = Math.min(2500, Math.floor(budget / 3));
  const t0 = Date.now();
  let attempt = 0, lastStatus = 0, lastErr = "";
  while (true) {
    const left = budget - (Date.now() - t0);
    if (left < minLeft) break;
    const base = list[attempt % list.length];
    let wait = Math.min(backoff * (attempt + 1), 4000);
    try {
      const r = await fetch(base + "/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ number }),
        signal: AbortSignal.timeout(Math.min(perTry, left))
      });
      lastStatus = r.status;
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (data && typeof data === "object" && !data.error) return { data };
        lastErr = data && data.error ? String(data.error) : "illisible";
      } else if (r.status === 400 || r.status === 422) {
        const d = await r.json().catch(() => null);
        return { data: d || { error: "Numéro refusé par le service." } };
      } else {
        const ra = Number(r.headers.get && r.headers.get("Retry-After"));
        if (ra > 0) wait = Math.min(ra * 1000, 5000);
      }
    } catch (e) {
      lastErr = isTimeout(e) ? "timeout" : String((e && e.message) || "réseau");
      lastStatus = 0;
    }
    attempt++;
    if (budget - (Date.now() - t0) < minLeft + wait) break;
    await sleep(wait);
  }
  return { error: friendly(lastStatus, lastErr), status: lastStatus };
}

const cacheKey = (number) => new Request("https://snow-cache.invalid/check/" + encodeURIComponent(number));
async function cacheGet(number) {
  try { if (typeof caches === "undefined" || !caches.default) return null; const r = await caches.default.match(cacheKey(number)); return r ? await r.json() : null; } catch { return null; }
}
async function cachePut(env, number, payload) {
  try {
    if (typeof caches === "undefined" || !caches.default) return;
    const ttl = Math.max(0, Math.min(Number(env.BANCHECK_CACHE_S ?? 120), 600));
    if (!ttl) return;
    await caches.default.put(cacheKey(number), new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=" + ttl } }));
  } catch { /* cache facultatif */ }
}

// Gains : identifie l'utilisateur via son jeton Supabase, puis appelle la fonction SQL réservée au serveur.
async function award(env, request, number, status) {
  const key = env.SB_SERVICE_KEY;
  if (!key) return { status: "disabled" };
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") || "");
  if (!m) return null; // visiteur non connecté : pas de gain
  const base = String(env.SB_URL || DEFAULT_SB_URL).replace(/\/+$/, "");
  try {
    const u = await fetch(base + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + m[1] }, signal: AbortSignal.timeout(6000) });
    if (!u.ok) return null;
    const user = await u.json().catch(() => null);
    if (!user || !user.id) return null;
    const headers = { apikey: key, "Content-Type": "application/json" };
    if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key; // les nouvelles clés sb_secret_ n'en ont pas besoin
    const r = await fetch(base + "/rest/v1/rpc/award_check", {
      method: "POST", headers, body: JSON.stringify({ p_user: user.id, p_number: number, p_status: status }), signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return { status: "error" };
    const out = await r.json().catch(() => null);
    return out && typeof out === "object" ? out : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export async function onRequestPost(context) {
  const { request, env = {} } = context;
  let body; try { body = await request.json(); } catch { return json({ success: false, error: "Corps JSON invalide." }, 400); }
  let number; try { number = normalizeNumber(body && body.number); } catch (e) { return json({ success: false, error: e.message }, 400); }

  let result = await cacheGet(number), cached = !!result;
  if (!result) {
    const up = await callUpstream(env, number);
    if (up.error) return json({ success: false, error: up.error }, 502);
    let st;
    try { st = interpretBanStatus(up.data); } catch (e) { return json({ success: false, error: e.message }, 502); }
    result = { success: true, number, ...st, checkedAt: new Date().toISOString() };
    if (typeof st.banned === "boolean") await cachePut(env, number, result);
  }
  const reward = typeof result.banned === "boolean" ? await award(env, request, number, result.status) : null;
  return json({ ...result, cached, reward });
}

// Réveille l'API (les services Render gratuits s'endorment) — appelé discrètement à l'ouverture du site.
export async function onRequestGet(context) {
  const env = context.env || {};
  const ping = fetch(bases(env)[0] + "/", { signal: AbortSignal.timeout(4000) }).catch(() => {});
  if (context.waitUntil) context.waitUntil(ping); else await ping;
  return json({ ok: true });
}
