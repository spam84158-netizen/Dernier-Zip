#!/usr/bin/env python3
"""Snow Cloud Chek — LOT 4 (profil) + CORRECTIFS (check qui ne répond plus, code de parrainage).
Usage, depuis la racine du dépôt :
    rm -rf /tmp/snow4 && unzip -oq ~/storage/downloads/snow-lot4.zip -d /tmp/snow4
    python3 /tmp/snow4/apply_lot4.py
Chaque fichier remplacé est d'abord SAUVEGARDÉ dans _sauvegarde_<date>/ (tes modifications ne sont jamais perdues).
Idempotent. Ne touche pas à tes clés (supabase-config.js, turnstile-config.js, api-config.js)."""
import os, sys, re, shutil, time

SRC = os.path.dirname(os.path.abspath(__file__)); DST = os.getcwd()
IDX = os.path.join(DST, "inconnuboy", "index.html")
if not os.path.exists(IDX): sys.exit("ERREUR : lance ce script depuis la racine du dépôt (dossier qui contient « inconnuboy »).")
s = open(IDX, encoding="utf-8").read()
if "snow-v2.js" not in s: sys.exit("ERREUR : le lot 1 n'est pas installé (python3 apply_lot1.py).")

FILES = ["functions/api/check.js", "inconnuboy/snow-v2.js", "inconnuboy/snow-v2.css", "inconnuboy/snow-lot2.js", "inconnuboy/snow-lot4.js", "inconnuboy/snow-lot4.css", "supabase/schema_fix.sql"]
stamp = time.strftime("%Y%m%d-%H%M%S"); bak = os.path.join(DST, "_sauvegarde_" + stamp); report = []
if os.path.normcase(SRC) != os.path.normcase(DST):
    for f in FILES:
        a, b = os.path.join(SRC, f), os.path.join(DST, f)
        if not os.path.exists(a): sys.exit("ERREUR : fichier manquant dans l'archive : " + f)
        new = open(a, "rb").read()
        if os.path.exists(b):
            old = open(b, "rb").read()
            if old == new: report.append(("identique", f)); continue
            os.makedirs(os.path.dirname(os.path.join(bak, f)), exist_ok=True); shutil.copy2(b, os.path.join(bak, f)); report.append(("remplacé (ancien gardé)", f))
        else: report.append(("ajouté", f))
        os.makedirs(os.path.dirname(b), exist_ok=True); open(b, "wb").write(new)

# index.html : charge le lot 4 après le dernier lot présent
done = []
if "snow-lot4.css" not in s:
    anchor = next((x for x in ['<link rel="stylesheet" href="./snow-lot3.css">', '<link rel="stylesheet" href="./snow-lot2.css">', '<link rel="stylesheet" href="./snow-v2.css">'] if x in s), None)
    assert anchor, "feuille de style de référence introuvable"
    s = s.replace(anchor, anchor + '\n<link rel="stylesheet" href="./snow-lot4.css">', 1); done.append("snow-lot4.css")
if "snow-lot4.js" not in s:
    anchor = next((x for x in ['<script src="./snow-lot3.js"></script>', '<script src="./snow-lot2.js"></script>', '<script src="./snow-v2.js"></script>'] if x in s), None)
    assert anchor, "script de référence introuvable"
    s = s.replace(anchor, anchor + '\n<script src="./snow-lot4.js"></script>', 1); done.append("snow-lot4.js")
open(IDX, "w", encoding="utf-8").write(s)
sw = os.path.join(DST, "inconnuboy", "sw.js")
if os.path.exists(sw):
    w = open(sw, encoding="utf-8").read(); m = re.search(r"snow-cloud-v(\d+)'", w)
    if m: open(sw, "w", encoding="utf-8").write(w.replace(m.group(0), "snow-cloud-v%d'" % (int(m.group(1)) + 1), 1)); done.append("cache v%d" % (int(m.group(1)) + 1))
gi = os.path.join(DST, ".gitignore")
if os.path.exists(bak):
    g = open(gi, encoding="utf-8").read() if os.path.exists(gi) else ""
    if "_sauvegarde_" not in g: open(gi, "a", encoding="utf-8").write("\n_sauvegarde_*/\n")
print("Fichiers :"); [print("  -", a, ":", f) for a, f in report]
print("index.html :", ", ".join(done) if done else "déjà à jour")
if os.path.exists(bak): print("Anciennes versions gardées dans :", os.path.basename(bak))
