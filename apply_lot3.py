#!/usr/bin/env python3
"""Snow Cloud Chek — LOT 3 (messagerie : groupes, chaînes, messages privés).
À lancer à la racine du dépôt, APRÈS les lots 1 et 2. Idempotent. Ne touche pas à tes clés."""
import os, sys
IDX = "inconnuboy/index.html"; SW = "inconnuboy/sw.js"
if not os.path.exists(IDX): sys.exit("ERREUR : lance ce script depuis la racine du dépôt (dossier qui contient « inconnuboy »).")
s = open(IDX, encoding="utf-8").read()
if "snow-lot2.js" not in s: sys.exit("ERREUR : installe d'abord les lots 1 et 2.")
done = []
if "snow-lot3.css" not in s:
    a = '<link rel="stylesheet" href="./snow-lot2.css">'; assert a in s
    s = s.replace(a, a + '\n<link rel="stylesheet" href="./snow-lot3.css">', 1); done.append("snow-lot3.css")
if "snow-lot3.js" not in s:
    a = '<script src="./snow-lot2.js"></script>'; assert a in s
    s = s.replace(a, a + '\n<script src="./snow-lot3.js"></script>', 1); done.append("snow-lot3.js")
open(IDX, "w", encoding="utf-8").write(s)
if os.path.exists(SW):
    w = open(SW, encoding="utf-8").read()
    if "snow-cloud-v3'" in w: open(SW, "w", encoding="utf-8").write(w.replace("snow-cloud-v3'", "snow-cloud-v4'", 1)); done.append("cache v4")
print("OK — modifications :", ", ".join(done) if done else "rien à faire (déjà à jour)")
