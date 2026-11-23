#!/usr/bin/env python3
"""Snow Cloud Chek — LOT 2 (gains, missions, retraits, parrainage, administration).
À lancer à la racine du dépôt, APRÈS le lot 1. Idempotent. Ne touche pas à tes clés."""
import os, sys
IDX = "inconnuboy/index.html"; SW = "inconnuboy/sw.js"
if not os.path.exists(IDX): sys.exit("ERREUR : lance ce script depuis la racine du dépôt (dossier qui contient « inconnuboy »).")
s = open(IDX, encoding="utf-8").read()
if "snow-v2.js" not in s: sys.exit("ERREUR : installe d'abord le lot 1 (python3 apply_lot1.py).")
done = []
if "snow-lot2.css" not in s:
    a = '<link rel="stylesheet" href="./snow-v2.css">'; assert a in s
    s = s.replace(a, a + '\n<link rel="stylesheet" href="./snow-lot2.css">', 1); done.append("snow-lot2.css")
if "snow-lot2.js" not in s:
    a = '<script src="./snow-v2.js"></script>'; assert a in s
    s = s.replace(a, a + '\n<script src="./snow-lot2.js"></script>', 1); done.append("snow-lot2.js")
open(IDX, "w", encoding="utf-8").write(s)
if os.path.exists(SW):
    w = open(SW, encoding="utf-8").read()
    if "snow-cloud-v2'" in w: open(SW, "w", encoding="utf-8").write(w.replace("snow-cloud-v2'", "snow-cloud-v3'", 1)); done.append("cache v3")
os.makedirs("inconnuboy/logos", exist_ok=True)
print("OK — modifications :", ", ".join(done) if done else "rien à faire (déjà à jour)")
print("Logos de paiement : dépose-les dans inconnuboy/logos/ (voir LISEZMOI.txt)")
