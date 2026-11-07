# Technická dokumentace — Pokyny a rozcestník

Kompletní technická dokumentace projektu podle oddílu 5 zadání předmětu KPPRO je připravena v souboru **[`DOKUMENTACE.md`](./DOKUMENTACE.md)**.

## Povinné náležitosti (checklist)

- [x] **1. Titulní strana** (šablona v `DOKUMENTACE.md`, student doplní jméno a obor)
- [x] **2. Úvod** (popis problému klienta, účel a rozsah aplikace)
- [x] **3. Datový model** (textový popis entit, vazba M:N, Mermaid ERD diagram)
- [x] **4. Architektura** (popis 3 vrstev, diagram, garance jednosměrnosti závislostí)
- [x] **5. Použité technologie** (přehled technologií a odůvodnění)
- [x] **6. Spuštění** (krok za krokem, `.env`, Docker Compose, přehled REST API endpointů)
- [x] **7. Testy** (jednotkové testy bez DB, integrační testy s PostgreSQL, návod na spuštění)
- [x] **8. Protokol o zacyklení** — hotovo, viz `DOKUMENTACE.md`

## Generování finálního PDF

`DOKUMENTACE.pdf` je už vygenerované. Pokud `DOKUMENTACE.md` ještě upravíš (např. doplníš
jméno/obor v sekci 1, nebo zpřesníš sekce 8/9 vlastními slovy), spusť znovu:

```bash
pip install markdown xhtml2pdf
python generate_pdf.py
```

(`generate_pdf.py` v této složce — řeší i správné zobrazení české diakritiky, viz komentář
v souboru.) Alternativně jde použít i VS Code rozšíření Markdown PDF, Pandoc nebo Typst.
