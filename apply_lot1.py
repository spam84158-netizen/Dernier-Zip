#!/usr/bin/env python3
"""Snow Cloud Chek — mise à jour LOT 1. À lancer à la racine du dépôt (là où se trouve le dossier inconnuboy).
Idempotent : on peut le relancer sans danger. Ne touche pas à tes clés (supabase-config.js, turnstile-config.js, api-config.js)."""
import os, sys, re

IDX = "inconnuboy/index.html"
SW = "inconnuboy/sw.js"
if not os.path.exists(IDX):
    sys.exit("ERREUR : lance ce script depuis la racine du dépôt (dossier qui contient « inconnuboy »).")

def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8").write(s)

s = rd(IDX); done = []

# 1) thème appliqué dès le départ (évite le flash blanc en mode sombre)
EARLY = '<script>try{var t=localStorage.getItem("sc-theme");if(t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark"}catch(e){}</script>'
if "sc-theme" not in s:
    assert "</head>" in s, "balise </head> introuvable"
    s = s.replace("</head>", EARLY + "\n</head>", 1); done.append("thème précoce")

# 2) feuille de style
LINK = '<link rel="stylesheet" href="./snow-v2.css">'
if "snow-v2.css" not in s:
    anchor = '<link rel="stylesheet" href="./polish.css">'
    assert anchor in s, "lien polish.css introuvable"
    s = s.replace(anchor, anchor + "\n" + LINK, 1); done.append("snow-v2.css")

# 3) script
SCR = '<script src="./snow-v2.js"></script>'
if "snow-v2.js" not in s:
    anchor = '<script src="./shell.js"></script>'
    assert anchor in s, "script shell.js introuvable"
    s = s.replace(anchor, anchor + "\n" + SCR, 1); done.append("snow-v2.js")

# 4) délai d'attente du check : 20 s -> 55 s (le serveur fait maintenant des reprises automatiques)
if "ctrl.abort(), 20000" in s:
    s = s.replace("ctrl.abort(), 20000", "ctrl.abort(), 55000", 1); done.append("délai 55 s")
wr(IDX, s)

# 5) service worker : nouvelle version du cache
if os.path.exists(SW):
    w = rd(SW)
    if "snow-cloud-v1'" in w:
        wr(SW, w.replace("snow-cloud-v1'", "snow-cloud-v2'", 1)); done.append("cache v2")

# 6) dossier des vidéos
os.makedirs("inconnuboy/videos", exist_ok=True)
print("OK — modifications :", ", ".join(done) if done else "rien à faire (déjà à jour)")
print("Vidéos : dépose tes fichiers dans inconnuboy/videos/  (voir LISEZMOI.txt)")
