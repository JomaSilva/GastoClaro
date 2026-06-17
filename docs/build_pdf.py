# -*- coding: utf-8 -*-
"""
Gerador da documentação em PDF do GastoClaro.
Lê docs/sections.json -> monta cover.html + body.html -> renderiza com Edge headless
-> mescla e carimba números de página -> docs/GastoClaro-Documentacao.pdf
"""
import json, os, re, subprocess, tempfile, html, glob, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_PDF = os.path.join(ROOT, "GastoClaro-Documentacao.pdf")
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# ---------------------------------------------------------------- metadados
META = {
    "title": "GastoClaro",
    "subtitle": "Documentação Técnica",
    "tagline": "Controle de gastos pessoais com Inteligência Artificial",
    "version": "1.0",
    "date": "Junho de 2026",
    "author": "Equipe GastoClaro",
}

# ícones (lucide, stroke currentColor) por seção
ICONS = {
    "compass": '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    "layout": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    "server": '<rect x="2" y="3" width="20" height="6" rx="2"/><rect x="2" y="15" width="20" height="6" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "sparkles": '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>',
    "card": '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    "trending": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    "book": '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
}

METHOD_COLORS = {
    "GET": ("#065f46", "#d1fae5", "#10b981"),
    "POST": ("#1e3a8a", "#dbeafe", "#3b82f6"),
    "PATCH": ("#92400e", "#fef3c7", "#f59e0b"),
    "PUT": ("#92400e", "#fef3c7", "#f59e0b"),
    "DELETE": ("#991b1b", "#fee2e2", "#ef4444"),
}

# ---------------------------------------------------------------- helpers
def esc(s):
    return html.escape(str(s if s is not None else ""))

def inline(s):
    """escape + markdown leve: `code`, **bold**, *italic*"""
    s = esc(s)
    s = re.sub(r"`([^`]+)`", r'<code class="ic">\1</code>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\*\w])\*([^*\n]+)\*(?![\*\w])", r"<em>\1</em>", s)
    return s

def method_badge(val):
    key = val.strip().upper()
    if key in METHOD_COLORS:
        fg, bg, _ = METHOD_COLORS[key]
        return f'<span class="mb" style="color:{fg};background:{bg}">{esc(key)}</span>'
    return None

def render_table(t):
    headers = t.get("headers", [])
    rows = t.get("rows", [])
    cap = t.get("caption")
    out = ['<div class="tbl-wrap">']
    if cap:
        out.append(f'<div class="tbl-cap">{inline(cap)}</div>')
    out.append('<table class="tbl"><thead><tr>')
    for h in headers:
        out.append(f"<th>{inline(h)}</th>")
    out.append("</tr></thead><tbody>")
    for row in rows:
        out.append("<tr>")
        for cell in row:
            badge = method_badge(cell) if cell else None
            if badge:
                out.append(f"<td>{badge}</td>")
            else:
                out.append(f"<td>{inline(cell)}</td>")
        # pad missing cells
        for _ in range(len(headers) - len(row)):
            out.append("<td></td>")
        out.append("</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)

def render_code(cb):
    code = cb.get("code", "")
    lang = cb.get("lang", "")
    cap = cb.get("caption", "")
    head = ""
    if lang or cap:
        label = esc(cap) if cap else esc(lang)
        tag = f'<span class="lang">{esc(lang)}</span>' if lang else ""
        head = f'<div class="code-head">{tag}<span class="code-cap">{label if not lang else esc(cap)}</span></div>'
    return f'<div class="code">{head}<pre>{esc(code)}</pre></div>'

def render_subsection(ss):
    out = []
    h = ss.get("heading")
    if h:
        out.append(f'<h3 class="sub">{inline(h)}</h3>')
    for p in ss.get("paragraphs", []) or []:
        out.append(f"<p>{inline(p)}</p>")
    bullets = ss.get("bullets", []) or []
    if bullets:
        out.append('<ul class="ul">')
        for b in bullets:
            out.append(f"<li>{inline(b)}</li>")
        out.append("</ul>")
    for t in ss.get("tables", []) or []:
        out.append(render_table(t))
    for cb in ss.get("code_blocks", []) or []:
        out.append(render_code(cb))
    return "".join(out)

def render_section(sec, num):
    icon = ICONS.get(sec.get("icon", "book"), ICONS["book"])
    title = sec["section_title"]
    intro = sec.get("intro", "")
    out = [f'<section class="sec" id="sec{num}">']
    out.append(f'''<div class="sec-head">
        <div class="sec-num">{num:02d}</div>
        <div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{icon}</svg></div>
        <h2 class="sec-title">{esc(title)}</h2>
    </div>''')
    if intro:
        out.append(f'<p class="sec-intro">{inline(intro)}</p>')
    for ss in sec.get("subsections", []):
        out.append(render_subsection(ss))
    out.append("</section>")
    return "".join(out)

# ---------------------------------------------------------------- CSS
FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');"

CSS_COMMON = FONT_IMPORT + """
* { box-sizing: border-box; }
:root{
  --emerald:#059669; --emerald-d:#047857; --emerald-l:#10b981; --mint:#34d399;
  --ink:#0b1220; --slate900:#0f172a; --slate800:#1e293b; --slate700:#334155;
  --slate600:#475569; --slate500:#64748b; --slate300:#cbd5e1; --slate200:#e2e8f0;
  --slate100:#f1f5f9; --slate50:#f8fafc; --sky:#0ea5e9; --amber:#f59e0b;
}
html,body{ margin:0; padding:0; }
body{
  font-family:'Inter','Segoe UI',system-ui,sans-serif;
  color:var(--slate800); line-height:1.62; font-size:10.4pt;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
code,pre{ font-family:'JetBrains Mono','Cascadia Code','Consolas',monospace; }
"""

CSS_COVER = CSS_COMMON + """
@page { size:A4; margin:0; }
.cover{
  position:relative; width:210mm; height:297mm; overflow:hidden;
  background:
    radial-gradient(120% 80% at 80% -10%, rgba(16,185,129,.28), transparent 55%),
    radial-gradient(90% 70% at -10% 110%, rgba(14,165,233,.20), transparent 50%),
    linear-gradient(160deg,#0b1220 0%, #0e1a2b 55%, #0b1727 100%);
  color:#fff;
}
.cover .grid{
  position:absolute; inset:0;
  background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);
  background-size:26px 26px; mask-image:radial-gradient(80% 70% at 70% 20%,#000,transparent 75%);
}
.cover .glow{ position:absolute; width:520px; height:520px; right:-120px; top:-120px;
  background:radial-gradient(circle,rgba(16,185,129,.55),transparent 62%); filter:blur(8px); }
.cover .inner{ position:absolute; inset:0; padding:30mm 26mm; display:flex; flex-direction:column; }
.brand{ display:flex; align-items:center; gap:14px; }
.brand .logo{
  width:54px; height:54px; border-radius:15px;
  background:linear-gradient(135deg,var(--emerald-l),var(--sky));
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 10px 30px rgba(16,185,129,.45);
}
.brand .logo svg{ width:30px; height:30px; color:#fff; }
.brand .wm{ font-weight:800; font-size:22pt; letter-spacing:-.5px; }
.brand .wm span{ color:var(--mint); }
.cover .center{ margin-top:auto; }
.kicker{ text-transform:uppercase; letter-spacing:4px; font-size:9pt; font-weight:600;
  color:var(--mint); margin-bottom:14px; }
.cover h1{ font-size:52pt; line-height:1.02; font-weight:800; letter-spacing:-1.5px; margin:0; }
.cover h1 .sub2{ display:block; font-size:25pt; font-weight:600; color:#cbd5e1; margin-top:10px; letter-spacing:-.5px;}
.cover .tag{ font-size:13pt; color:#94a3b8; margin-top:22px; max-width:135mm; }
.chips{ display:flex; gap:10px; margin-top:30px; flex-wrap:wrap; }
.chip{ border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.05);
  padding:8px 16px; border-radius:999px; font-size:9.5pt; color:#e2e8f0; }
.chip b{ color:#fff; }
.cover .foot{ margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end;
  border-top:1px solid rgba(255,255,255,.12); padding-top:18px; font-size:9pt; color:#94a3b8; }
.stack-vis{ display:flex; align-items:flex-end; gap:7px; height:60px; }
.stack-vis i{ width:12px; border-radius:4px 4px 0 0; background:linear-gradient(180deg,var(--mint),var(--emerald)); display:block;}
"""

CSS_BODY = CSS_COMMON + """
@page { size:A4; margin:21mm 16mm 20mm 16mm; }
/* cabeçalho e rodapé de cada página são desenhados via overlay (reportlab),
   garantindo posição idêntica em todas as páginas */
.wrap{ max-width:178mm; }

/* TOC */
.toc{ page-break-after:always; }
.toc-h{ font-size:24pt; font-weight:800; color:var(--slate900); letter-spacing:-.5px; margin:4mm 0 2mm; }
.toc-rule{ height:4px; width:70px; background:linear-gradient(90deg,var(--emerald),var(--sky)); border-radius:3px; margin-bottom:10mm;}
.toc-list{ list-style:none; padding:0; margin:0; }
.toc-list li{ display:flex; align-items:center; gap:16px; padding:11px 0; border-bottom:1px solid var(--slate200); }
.toc-list .n{ font-family:'JetBrains Mono',monospace; font-weight:700; color:var(--emerald);
  font-size:11pt; width:34px; }
.toc-list .t{ font-weight:600; color:var(--slate800); font-size:11.5pt; }
.toc-list .d{ flex:1; border-bottom:1px dotted var(--slate300); margin:0 6px 4px; }

/* section */
.sec{ page-break-before:always; }
.sec:first-of-type{ page-break-before:avoid; }
.sec-head{ display:flex; align-items:center; gap:14px; margin:2mm 0 5mm; padding-bottom:5mm;
  border-bottom:2px solid var(--slate200); position:relative; }
.sec-head:after{ content:""; position:absolute; left:0; bottom:-2px; width:90px; height:2px;
  background:linear-gradient(90deg,var(--emerald),var(--sky)); }
.sec-num{ font-family:'JetBrains Mono',monospace; font-size:13pt; font-weight:700;
  color:#fff; background:linear-gradient(135deg,var(--emerald),var(--emerald-d));
  width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center;
  box-shadow:0 6px 16px rgba(5,150,105,.30); }
.sec-ico{ width:34px; height:34px; color:var(--emerald); }
.sec-ico svg{ width:100%; height:100%; }
.sec-title{ font-size:21pt; font-weight:800; color:var(--slate900); letter-spacing:-.6px; margin:0; }
.sec-intro{ font-size:11pt; color:var(--slate600); margin:0 0 6mm; padding:12px 16px;
  background:var(--slate50); border-left:4px solid var(--emerald-l); border-radius:0 8px 8px 0; }

h3.sub{ font-size:13pt; font-weight:700; color:var(--slate900); margin:7mm 0 2.5mm;
  letter-spacing:-.3px; display:flex; align-items:center; gap:9px; page-break-after:avoid; }
h3.sub:before{ content:""; width:9px; height:9px; border-radius:3px; flex:none;
  background:linear-gradient(135deg,var(--emerald-l),var(--sky)); }
p{ margin:0 0 3mm; }
.ic{ background:var(--slate100); color:var(--emerald-d); padding:1px 6px; border-radius:5px;
  font-size:9pt; border:1px solid var(--slate200); }

ul.ul{ margin:0 0 4mm; padding:0; list-style:none; }
ul.ul li{ position:relative; padding:1.5px 0 1.5px 20px; margin-bottom:2.5px; }
ul.ul li:before{ content:""; position:absolute; left:2px; top:9px; width:7px; height:7px;
  border-radius:50%; background:var(--emerald-l); box-shadow:0 0 0 3px rgba(16,185,129,.15); }

/* tables */
.tbl-wrap{ margin:3mm 0 5mm; border:1px solid var(--slate200); border-radius:10px; overflow:hidden; }
.tbl-cap{ font-size:9pt; font-weight:600; color:var(--slate600); background:var(--slate50);
  padding:8px 14px; border-bottom:1px solid var(--slate200); }
table.tbl{ width:100%; border-collapse:collapse; font-size:9pt; }
table.tbl thead th{ background:linear-gradient(135deg,var(--slate900),var(--slate800)); color:#fff;
  text-align:left; padding:9px 12px; font-weight:600; font-size:8.6pt; letter-spacing:.2px;
  text-transform:uppercase; }
table.tbl tbody td{ padding:8px 12px; border-top:1px solid var(--slate200); vertical-align:top;
  color:var(--slate700); }
table.tbl tbody tr:nth-child(even){ background:var(--slate50); }
.mb{ font-family:'JetBrains Mono',monospace; font-weight:700; font-size:8pt; padding:3px 9px;
  border-radius:6px; letter-spacing:.4px; display:inline-block; }

/* code */
.code{ margin:3mm 0 5mm; border-radius:10px; overflow:hidden; border:1px solid #1e293b;
  background:#0f172a; box-shadow:0 4px 14px rgba(15,23,42,.18); }
.code-head{ display:flex; align-items:center; gap:10px; padding:7px 14px;
  background:#0b1220; border-bottom:1px solid #1e293b; }
.code-head .lang{ font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.5px;
  color:#0b1220; background:var(--mint); padding:2px 8px; border-radius:5px; }
.code-head .code-cap{ font-size:8.5pt; color:#94a3b8; }
.code pre{ margin:0; padding:13px 16px; color:#e2e8f0; font-size:8.6pt; line-height:1.6;
  white-space:pre-wrap; word-break:break-word; }

.tbl-wrap, .code, table, tr, .sec-head, h3.sub { break-inside:avoid; }
"""

# ---------------------------------------------------------------- montagem
def build_cover():
    bars = "".join(f'<i style="height:{h}%"></i>' for h in [38,58,46,78,62,90,72,100])
    coin = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/>'
            '<path d="M12 7v10M9.5 9.2a2.5 2.5 0 0 1 2.5-1.2c1.4 0 2.5.8 2.5 1.9 0 2.6-5 1.6-5 4.1'
            ' 0 1.1 1.1 1.9 2.5 1.9a2.5 2.5 0 0 0 2.5-1.2"/></svg>')
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS_COVER}</style></head>
<body><div class="cover"><div class="grid"></div><div class="glow"></div>
<div class="inner">
  <div class="brand">
    <div class="logo">{coin}</div>
    <div class="wm">Gasto<span>Claro</span></div>
  </div>
  <div class="center">
    <div class="kicker">{esc(META['subtitle'])}</div>
    <h1>Documentação<span class="sub2">do Projeto &amp; Arquitetura Técnica</span></h1>
    <div class="tag">{esc(META['tagline'])} — manual completo de funcionalidades, API, modelo de dados, segurança e operação.</div>
    <div class="chips">
      <div class="chip">Versão <b>{esc(META['version'])}</b></div>
      <div class="chip">{esc(META['date'])}</div>
      <div class="chip">React 19 · Node/Express · SQLite · Claude</div>
    </div>
  </div>
  <div class="foot">
    <div>{esc(META['author'])}<br>Documentação técnica confidencial</div>
    <div class="stack-vis">{bars}</div>
  </div>
</div></div></body></html>"""

def build_body(sections):
    toc_items = "".join(
        f'<li><span class="n">{i+1:02d}</span><span class="t">{esc(s["section_title"])}</span>'
        f'<span class="d"></span></li>'
        for i, s in enumerate(sections)
    )
    secs_html = "".join(render_section(s, i + 1) for i, s in enumerate(sections))
    toc = (f'<div class="toc"><div class="toc-h">Sumário</div><div class="toc-rule"></div>'
           f'<ul class="toc-list">{toc_items}</ul></div>')
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS_BODY}</style></head>'
            f'<body><div class="wrap">{toc}{secs_html}</div></body></html>')

def render_pdf(html_path, pdf_path):
    import time
    html_fs = html_path.replace("\\", "/")
    pdf_fs = pdf_path.replace("\\", "/")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    last = None
    for attempt in range(3):
        tmp = tempfile.mkdtemp(prefix="edgepdf_")
        try:
            subprocess.run([EDGE, "--headless", "--disable-gpu", f"--user-data-dir={tmp}",
                            "--no-first-run", "--no-pdf-header-footer",
                            f"--print-to-pdf={pdf_fs}", html_fs],
                           timeout=180, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:  # noqa
            last = e
        finally:
            # aguarda o flush do arquivo (Edge pode retornar antes de escrever)
            for _ in range(40):
                if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
                    break
                time.sleep(0.25)
            shutil.rmtree(tmp, ignore_errors=True)
        if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
            return
        time.sleep(0.6)
    raise RuntimeError(f"Edge não gerou o PDF após 3 tentativas: {pdf_path} ({last})")

def stamp_footers(cover_pdf, body_pdf, out_pdf):
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor

    body = PdfReader(body_pdf)
    n = len(body.pages)
    overlay_path = os.path.join(ROOT, "_ov.pdf")
    c = canvas.Canvas(overlay_path, pagesize=A4)
    W, H = A4
    LM, RM = 16*mm, W-16*mm
    for i in range(n):
        # --- cabeçalho ---
        c.setFillColor(HexColor("#10b981"))
        c.roundRect(LM, H-13*mm, 2.6*mm, 2.6*mm, 0.8*mm, fill=1, stroke=0)
        c.setFillColor(HexColor("#0f172a")); c.setFont("Helvetica-Bold", 8)
        c.drawString(LM+4*mm, H-12.5*mm, "GastoClaro")
        c.setFillColor(HexColor("#94a3b8")); c.setFont("Helvetica", 7.6)
        c.drawRightString(RM, H-12.5*mm, f"Documentação Técnica · v{META['version']}")
        c.setStrokeColor(HexColor("#e2e8f0")); c.setLineWidth(0.6)
        c.line(LM, H-14.4*mm, RM, H-14.4*mm)
        # --- rodapé ---
        c.line(LM, 13*mm, RM, 13*mm)
        c.setFillColor(HexColor("#94a3b8")); c.setFont("Helvetica", 7.2)
        c.drawString(LM, 9.5*mm, "GastoClaro · Controle de gastos com Inteligência Artificial")
        c.setFillColor(HexColor("#059669")); c.setFont("Helvetica-Bold", 7.6)
        c.drawRightString(RM, 9.5*mm, f"Página {i+1} de {n}")
        c.showPage()
    c.save()

    ov = PdfReader(overlay_path)
    writer = PdfWriter()
    for p in PdfReader(cover_pdf).pages:
        writer.add_page(p)
    for i, p in enumerate(body.pages):
        p.merge_page(ov.pages[i])
        writer.add_page(p)
    writer.add_metadata({
        "/Title": "GastoClaro — Documentação Técnica",
        "/Author": META["author"],
        "/Subject": "Documentação do projeto GastoClaro (visão geral, API, dados, segurança, IA, planos e mercado)",
        "/Keywords": "GastoClaro, finanças pessoais, IA, Claude, React, Node, Express, SQLite, Stripe, documentação",
        "/Creator": "GastoClaro Docs Builder",
    })
    with open(out_pdf, "wb") as f:
        writer.write(f)
    os.remove(overlay_path)

def main():
    with open(os.path.join(ROOT, "sections.json"), encoding="utf-8") as f:
        sections = json.load(f)
    cover_html = os.path.join(ROOT, "_cover.html")
    body_html = os.path.join(ROOT, "_body.html")
    cover_pdf = os.path.join(ROOT, "_cover.pdf")
    body_pdf = os.path.join(ROOT, "_body.pdf")
    with open(cover_html, "w", encoding="utf-8") as f: f.write(build_cover())
    with open(body_html, "w", encoding="utf-8") as f: f.write(build_body(sections))
    render_pdf(cover_html, cover_pdf)
    render_pdf(body_html, body_pdf)
    stamp_footers(cover_pdf, body_pdf, OUT_PDF)
    for p in [cover_html, body_html, cover_pdf, body_pdf]:
        try: os.remove(p)
        except OSError: pass
    print("OK ->", OUT_PDF)

if __name__ == "__main__":
    main()
