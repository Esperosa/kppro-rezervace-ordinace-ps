"""
Znovu-vygeneruje DOKUMENTACE.pdf z DOKUMENTACE.md, se správnou ceskou diakritikou.

Pouziti (az dopises sekce 8 a 9 v DOKUMENTACE.md):
    pip install markdown xhtml2pdf
    python generate_pdf.py

Font se docasne zkopiruje do teto slozky, protoze xhtml2pdf nesmi cist soubory
mimo slozku se zdrojovym .md souborem (bezpecnostni sandbox). Po vygenerovani
PDF se font zase smaze.
"""
import os
import shutil
import markdown
from xhtml2pdf import pisa

HERE = os.path.dirname(os.path.abspath(__file__))
MD_PATH = os.path.join(HERE, "DOKUMENTACE.md")
PDF_PATH = os.path.join(HERE, "DOKUMENTACE.pdf")
WIN_FONTS = r"C:\Windows\Fonts"
FONT_FILES = ["arial.ttf", "arialbd.ttf", "consola.ttf"]

for name in FONT_FILES:
    shutil.copy(os.path.join(WIN_FONTS, name), os.path.join(HERE, name))

try:
    with open(MD_PATH, encoding="utf-8") as f:
        text = f.read()

    html_body = markdown.markdown(text, extensions=["tables", "fenced_code"])
    html = f"""<html><head><meta charset="utf-8">
    <style>
    @font-face {{ font-family: "MyArial"; src: url("arial.ttf"); }}
    @font-face {{ font-family: "MyArialBold"; src: url("arialbd.ttf"); }}
    @font-face {{ font-family: "MyConsolas"; src: url("consola.ttf"); }}
    * {{ font-family: "MyArial"; }}
    body, p, li, td, th, div, span {{ font-family: "MyArial"; font-size: 10pt; line-height: 1.4; }}
    h1, h2, h3, strong, b {{ font-family: "MyArialBold"; }}
    h1 {{ font-size: 18pt; }}
    h2 {{ font-size: 14pt; margin-top: 16pt; }}
    h3 {{ font-size: 12pt; }}
    code, pre {{ font-family: "MyConsolas"; background: #f4f4f4; }}
    pre {{ padding: 6pt; }}
    table {{ width: 100%; }}
    td, th {{ border: 1px solid #ccc; padding: 4pt; }}
    </style></head><body>{html_body}</body></html>"""

    with open(PDF_PATH, "wb") as out:
        pisa.CreatePDF(html, dest=out, path=MD_PATH)
    print("Hotovo:", PDF_PATH)
finally:
    for name in FONT_FILES:
        p = os.path.join(HERE, name)
        if os.path.exists(p):
            os.remove(p)
