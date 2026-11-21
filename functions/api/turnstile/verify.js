export async function onRequestPost({ request, env }) {
  const SECRET = String(env.TS_SECRET || env.TURNSTILE_SECRET || "").trim();
  const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"}});
  if (!SECRET) return json({success:false,error:"Cloudflare Turnstile n'est pas configuré côté serveur."},503);
  let body; try { body = await request.json(); } catch { return json({success:false,error:"Requête invalide."},400); }
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || token.length > 2048) return json({success:false,error:"Jeton Cloudflare manquant ou invalide."},400);
  try {
    const form = new FormData(); form.append("secret",SECRET.trim()); form.append("response",token);
    const ip=request.headers.get("CF-Connecting-IP"); if(ip) form.append("remoteip",ip);
    const check=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
    const result=await check.json();
    const hostname=new URL(request.url).hostname;
    const codes=(result["error-codes"]||[]).join(",");
    if(!check.ok || result.success!==true || result.action!=="login") return json({success:false,error:"La vérification Cloudflare a échoué. Réessayez. ["+(codes||("action="+result.action+" host="+result.hostname))+" len="+SECRET.trim().length+" fin="+SECRET.trim().slice(-3)+"]"},403);
    if(result.hostname && result.hostname!==hostname) return json({success:false,error:"Domaine de vérification inattendu. ["+result.hostname+" != "+hostname+"]"},403);
    return json({success:true});
  } catch (e) { return json({success:false,error:"Service Cloudflare temporairement indisponible. ["+(e&&e.message||"erreur")+"]"},502); }
}
