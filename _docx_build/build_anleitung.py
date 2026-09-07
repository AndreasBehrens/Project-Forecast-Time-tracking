#!/usr/bin/env python3
"""Build ANLEITUNG.docx from content.json — structural only, prose lives in JSON."""

import json
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
from docx.shared import Cm, Pt, RGBColor, Twips
from docx.enum.style import WD_STYLE_TYPE

ROOT = Path("/home/ubuntu/github_repos/Project-Forecast-Time-tracking")
CONTENT = ROOT / "_docx_build" / "content.json"
OUT = ROOT / "ANLEITUNG.docx"

# Design tokens
ACCENT = RGBColor(0x1A, 0x56, 0xDB)       # strong blue
ACCENT_DARK = RGBColor(0x0F, 0x2F, 0x6D)
NEAR_BLACK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x4B, 0x55, 0x63)
LIGHT_BG = "E8EEF9"
TIP_BG = "EEF6FF"
NOTE_BG = "F3F4F6"
TABLE_HEADER_BG = "1A56DB"
TABLE_ALT_BG = "F5F7FB"
ROW_LABEL_BG = "EEF2F7"


def set_run_font(run, name="Calibri", size=None, bold=None, italic=None, color=None):
    run.font.name = name
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.insert(0, rFonts)
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:eastAsia"), name)
    rFonts.set(qn("w:cs"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color is not None:
        run.font.color.rgb = color


def set_paragraph_spacing(p, before=0, after=6, line=1.15, align=None):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line
    if align is not None:
        pf.alignment = align


def set_cell_shading(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    existing = tcPr.find(qn("w:shd"))
    if existing is not None:
        tcPr.remove(existing)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_borders(cell, color="D0D7E2", sz="4"):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    existing = tcPr.find(qn("w:tcBorders"))
    if existing is not None:
        tcPr.remove(existing)
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), sz)
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        borders.append(el)
    tcPr.append(borders)


def set_cell_margins(cell, top=40, bottom=40, left=80, right=80):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.find(qn("w:tcMar"))
    if tcMar is not None:
        tcPr.remove(tcMar)
    tcMar = OxmlElement("w:tcMar")
    for edge, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        tcMar.append(el)
    tcPr.append(tcMar)


def clear_cell(cell):
    for p in list(cell.paragraphs):
        p._element.getparent().remove(p._element)


def add_cell_para(cell, text, bold=False, size=10, color=NEAR_BLACK, align=None, before=0, after=0):
    p = cell.add_paragraph()
    set_paragraph_spacing(p, before=before, after=after, line=1.1, align=align)
    run = p.add_run(text)
    set_run_font(run, name="Calibri", size=size, bold=bold, color=color)
    return p


def add_bottom_border(paragraph, color="1A56DB", sz="12"):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = pPr.find(qn("w:pBdr"))
    if pBdr is not None:
        pPr.remove(pBdr)
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), sz)
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def shade_paragraph(paragraph, hex_color):
    """Add a light shaded background via a single-cell table-like shading on the paragraph."""
    pPr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    pPr.append(shd)


def add_callout(doc, text, kind="info"):
    """Render a callout as a single-row, single-cell table with left accent border."""
    bg = {"info": "EEF6FF", "tip": "F0FDF4", "note": "F3F4F6"}.get(kind, "EEF6FF")
    border_color = {"info": "1A56DB", "tip": "16A34A", "note": "6B7280"}.get(kind, "1A56DB")
    prefix = {"info": "Hinweis: ", "tip": "Tipp: ", "note": "Hinweis: "}.get(kind, "")

    table = doc.add_table(rows=1, cols=1)
    table.autofit = True
    cell = table.cell(0, 0)
    clear_cell(cell)
    set_cell_shading(cell, bg)
    set_cell_margins(cell, top=60, bottom=60, left=100, right=100)

    # Left accent via cell borders
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge, col, sz in (
        ("top", bg, "0"),
        ("left", border_color, "24"),
        ("bottom", bg, "0"),
        ("right", bg, "0"),
    ):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single" if sz != "0" else "nil")
        el.set(qn("w:sz"), sz)
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), col)
        borders.append(el)
    existing = tcPr.find(qn("w:tcBorders"))
    if existing is not None:
        tcPr.remove(existing)
    tcPr.append(borders)

    p = cell.add_paragraph()
    set_paragraph_spacing(p, before=0, after=0, line=1.15)
    r1 = p.add_run(prefix)
    set_run_font(r1, size=10, bold=True, color=ACCENT if kind != "tip" else RGBColor(0x16, 0xA3, 0x4A))
    r2 = p.add_run(text)
    set_run_font(r2, size=10, color=NEAR_BLACK)

    # Spacer after callout
    sp = doc.add_paragraph()
    set_paragraph_spacing(sp, before=0, after=4, line=1.0)
    return table


def add_body(doc, text, before=2, after=6, size=10.5):
    p = doc.add_paragraph()
    set_paragraph_spacing(p, before=before, after=after, line=1.15)
    run = p.add_run(text)
    set_run_font(run, size=size, color=NEAR_BLACK)
    return p


def add_bold_label_body(doc, label, text, before=1, after=4):
    p = doc.add_paragraph()
    set_paragraph_spacing(p, before=before, after=after, line=1.15)
    # bullet via numbering-like indent
    p.paragraph_format.left_indent = Cm(0.4)
    p.paragraph_format.first_line_indent = Cm(-0.25)
    r0 = p.add_run("• ")
    set_run_font(r0, size=10.5, color=ACCENT)
    r1 = p.add_run(label + " ")
    set_run_font(r1, size=10.5, bold=True, color=NEAR_BLACK)
    r2 = p.add_run(text)
    set_run_font(r2, size=10.5, color=NEAR_BLACK)
    return p


def add_plain_bullet(doc, text, before=1, after=3, indent=0.4):
    p = doc.add_paragraph()
    set_paragraph_spacing(p, before=before, after=after, line=1.15)
    p.paragraph_format.left_indent = Cm(indent)
    p.paragraph_format.first_line_indent = Cm(-0.25)
    r0 = p.add_run("• ")
    set_run_font(r0, size=10.5, color=ACCENT)
    r1 = p.add_run(text)
    set_run_font(r1, size=10.5, color=NEAR_BLACK)
    return p


def add_numbered_step(doc, n, text, before=1, after=3):
    p = doc.add_paragraph()
    set_paragraph_spacing(p, before=before, after=after, line=1.15)
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.first_line_indent = Cm(-0.4)
    r0 = p.add_run(f"{n}. ")
    set_run_font(r0, size=10.5, bold=True, color=ACCENT)
    r1 = p.add_run(text)
    set_run_font(r1, size=10.5, color=NEAR_BLACK)
    return p


def add_h1(doc, text):
    p = doc.add_paragraph(style="Heading 1")
    # clear default runs and set our own
    if p.runs:
        p.runs[0].text = text
        set_run_font(p.runs[0], name="Calibri", size=16, bold=True, color=ACCENT)
    else:
        run = p.add_run(text)
        set_run_font(run, name="Calibri", size=16, bold=True, color=ACCENT)
    set_paragraph_spacing(p, before=16, after=8, line=1.15)
    add_bottom_border(p, color="1A56DB", sz="12")
    return p


def add_h2(doc, text):
    p = doc.add_paragraph(style="Heading 2")
    if p.runs:
        p.runs[0].text = text
        set_run_font(p.runs[0], name="Calibri", size=13, bold=True, color=ACCENT_DARK)
    else:
        run = p.add_run(text)
        set_run_font(run, name="Calibri", size=13, bold=True, color=ACCENT_DARK)
    set_paragraph_spacing(p, before=12, after=5, line=1.15)
    return p


def add_h3(doc, text):
    p = doc.add_paragraph(style="Heading 3")
    if p.runs:
        p.runs[0].text = text
        set_run_font(p.runs[0], name="Calibri", size=11.5, bold=True, color=ACCENT)
    else:
        run = p.add_run(text)
        set_run_font(run, name="Calibri", size=11.5, bold=True, color=ACCENT)
    set_paragraph_spacing(p, before=10, after=4, line=1.15)
    return p


def add_lead(doc, text):
    p = doc.add_paragraph()
    set_paragraph_spacing(p, before=0, after=6, line=1.15)
    run = p.add_run(text)
    set_run_font(run, size=10.5, italic=True, color=MUTED)
    return p


def build_table(doc, headers, rows, first_col_bold=False, header_bg=TABLE_HEADER_BG):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.autofit = True
    table.allow_autofit = True

    # Header
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        clear_cell(cell)
        set_cell_shading(cell, header_bg)
        set_cell_margins(cell, top=50, bottom=50, left=70, right=70)
        set_cell_borders(cell, color="1548B8", sz="4")
        add_cell_para(cell, h if h else " ", bold=True, size=9.5, color=RGBColor(0xFF, 0xFF, 0xFF))

    # Body
    for r_idx, row in enumerate(rows):
        bg = TABLE_ALT_BG if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            cell = table.rows[r_idx + 1].cells[c_idx]
            clear_cell(cell)
            fill = ROW_LABEL_BG if (first_col_bold and c_idx == 0) else bg
            set_cell_shading(cell, fill)
            set_cell_margins(cell, top=40, bottom=40, left=70, right=70)
            set_cell_borders(cell, color="D0D7E2", sz="4")
            is_bold = first_col_bold and c_idx == 0
            add_cell_para(cell, val, bold=is_bold, size=9.5, color=NEAR_BLACK)

    # Spacer
    sp = doc.add_paragraph()
    set_paragraph_spacing(sp, before=2, after=4, line=1.0)
    return table


def configure_styles(doc):
    styles = doc.styles

    # Normal
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = NEAR_BLACK
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15
    rPr = normal.element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.insert(0, rFonts)
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rFonts.set(qn(attr), "Calibri")

    for style_name, size, color, before, after in (
        ("Heading 1", 16, ACCENT, 16, 8),
        ("Heading 2", 13, ACCENT_DARK, 12, 5),
        ("Heading 3", 11.5, ACCENT, 10, 4),
    ):
        st = styles[style_name]
        st.font.name = "Calibri"
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.color.rgb = color
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)
        rPr = st.element.get_or_add_rPr()
        rFonts = rPr.find(qn("w:rFonts"))
        if rFonts is None:
            rFonts = OxmlElement("w:rFonts")
            rPr.insert(0, rFonts)
        for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            rFonts.set(qn(attr), "Calibri")


def add_header_footer(doc):
    section = doc.sections[0]
    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.clear()
    set_paragraph_spacing(hp, before=0, after=2, line=1.0)
    r = hp.add_run("Insight Arcs  ·  Zeiterfassung")
    set_run_font(r, size=8.5, color=MUTED)
    # bottom border on header para
    add_bottom_border(hp, color="D0D7E2", sz="6")

    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.clear()
    set_paragraph_spacing(fp, before=2, after=0, line=1.0, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Page number field
    r1 = fp.add_run("Seite ")
    set_run_font(r1, size=8.5, color=MUTED)

    # PAGE field
    run_begin = fp.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    run_begin._r.append(fld_begin)

    run_instr = fp.add_run()
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    run_instr._r.append(instr)

    run_sep = fp.add_run()
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    run_sep._r.append(fld_sep)

    run_ph = fp.add_run("1")
    set_run_font(run_ph, size=8.5, color=MUTED)

    run_end = fp.add_run()
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run_end._r.append(fld_end)

    r2 = fp.add_run("  ·  DSGVO- & GoBD-konform")
    set_run_font(r2, size=8.5, color=MUTED)


def build():
    data = json.loads(CONTENT.read_text(encoding="utf-8"))
    doc = Document()

    # Page setup — slightly wider margins for a composed look, still full pages
    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)

    configure_styles(doc)
    add_header_footer(doc)

    # ── Title block ──────────────────────────────────────────────
    title = doc.add_paragraph()
    set_paragraph_spacing(title, before=4, after=2, line=1.1)
    tr = title.add_run(data["title"])
    set_run_font(tr, name="Calibri", size=22, bold=True, color=ACCENT_DARK)

    sub = doc.add_paragraph()
    set_paragraph_spacing(sub, before=0, after=6, line=1.1)
    sr = sub.add_run(data["subtitle"])
    set_run_font(sr, size=12, color=MUTED)

    # URL line
    url_p = doc.add_paragraph()
    set_paragraph_spacing(url_p, before=2, after=2, line=1.1)
    ur1 = url_p.add_run(data["url_label"] + ":  ")
    set_run_font(ur1, size=10.5, bold=True, color=NEAR_BLACK)
    ur2 = url_p.add_run(data["url"])
    set_run_font(ur2, size=10.5, bold=True, color=ACCENT)
    ur2.font.underline = True

    # English note
    en = doc.add_paragraph()
    set_paragraph_spacing(en, before=0, after=8, line=1.1)
    enr = en.add_run(data["english_note"])
    set_run_font(enr, size=9.5, italic=True, color=MUTED)

    # Thin accent rule under title block
    rule = doc.add_paragraph()
    set_paragraph_spacing(rule, before=0, after=8, line=1.0)
    add_bottom_border(rule, color="1A56DB", sz="18")

    # Intro
    add_body(doc, data["intro"], before=2, after=6)
    for item in data["intro_items"]:
        add_bold_label_body(doc, item["title"] + " –", item["text"])

    add_callout(doc, data["info_box"], kind="info")

    # ── Sections ─────────────────────────────────────────────────
    for sec in data["sections"]:
        add_h1(doc, sec["heading"])

        if sec["id"] == "purpose":
            add_body(doc, sec["paragraphs"][0])
            for b in sec["bullets"]:
                add_bold_label_body(doc, b["label"], b["text"])
            add_body(doc, sec["paragraphs"][1], before=4, after=6)

        elif sec["id"] == "login":
            steps = sec["steps"]
            # steps 1-3
            for i, s in enumerate(steps[:3], start=1):
                add_numbered_step(doc, i, s)
            # step 4 with sub-bullets
            add_numbered_step(doc, 4, steps[3])
            for sub in sec["step_4_sub"]:
                p = doc.add_paragraph()
                set_paragraph_spacing(p, before=1, after=2, line=1.15)
                p.paragraph_format.left_indent = Cm(1.1)
                p.paragraph_format.first_line_indent = Cm(-0.25)
                r0 = p.add_run("– ")
                set_run_font(r0, size=10.5, color=ACCENT)
                r1 = p.add_run(sub)
                set_run_font(r1, size=10.5, color=NEAR_BLACK)
            add_callout(doc, sec["tip"], kind="tip")
            # step 5
            add_numbered_step(doc, 5, steps[4])

        elif sec["id"] == "project_time":
            add_lead(doc, sec["lead"])
            add_body(doc, sec["intro"])
            for sub in sec["subsections"]:
                add_h2(doc, sub["heading"])
                if sub.get("intro"):
                    add_body(doc, sub["intro"])
                for i, s in enumerate(sub.get("steps", []), start=1):
                    add_numbered_step(doc, i, s)
                for b in sub.get("bullets", []):
                    add_bold_label_body(doc, b["label"], b["text"])
                for para in sub.get("paragraphs", []):
                    add_body(doc, para, before=3, after=5)
                if sub.get("note"):
                    add_callout(doc, sub["note"], kind="note")

        elif sec["id"] == "working_time":
            add_lead(doc, sec["lead"])
            # First paragraph + two condition bullets
            add_body(doc, sec["paragraphs"][0])
            add_plain_bullet(doc, sec["paragraphs"][1])
            add_plain_bullet(doc, sec["paragraphs"][2])

            for sub in sec["subsections"]:
                add_h2(doc, sub["heading"])
                if sub.get("intro"):
                    add_body(doc, sub["intro"])

                # Day-types table
                if sub.get("table_day_types"):
                    t = sub["table_day_types"]
                    build_table(doc, t["headers"], t["rows"])

                # Nested h3 blocks
                for h3 in sub.get("h3", []):
                    add_h3(doc, h3["heading"])
                    if h3.get("intro"):
                        add_body(doc, h3["intro"])
                    for b in h3.get("bullets", []):
                        add_bold_label_body(doc, b["label"], b["text"])
                        # sub-bullets after specific label
                        sb = h3.get("sub_bullets_after")
                        if sb and b["label"] == sb["after_label"]:
                            for item in sb["items"]:
                                p = doc.add_paragraph()
                                set_paragraph_spacing(p, before=0, after=2, line=1.15)
                                p.paragraph_format.left_indent = Cm(1.0)
                                p.paragraph_format.first_line_indent = Cm(-0.25)
                                r0 = p.add_run("– ")
                                set_run_font(r0, size=10, color=ACCENT)
                                r1 = p.add_run(item)
                                set_run_font(r1, size=10, color=NEAR_BLACK)
                    if h3.get("example"):
                        p = doc.add_paragraph()
                        set_paragraph_spacing(p, before=6, after=3, line=1.15)
                        r = p.add_run(h3["example_title"] + ": ")
                        set_run_font(r, size=10.5, bold=True, color=ACCENT_DARK)
                        r2 = p.add_run(h3["example"])
                        set_run_font(r2, size=10.5, color=NEAR_BLACK)
                        for eb in h3.get("example_bullets", []):
                            add_plain_bullet(doc, eb, indent=0.7)
                    if h3.get("metrics_intro"):
                        add_body(doc, h3["metrics_intro"], before=6, after=3)
                        for m in h3.get("metrics", []):
                            if m["text"]:
                                add_bold_label_body(doc, m["label"] + " –", m["text"])
                            else:
                                add_plain_bullet(doc, m["label"])

                # Steps
                for i, s in enumerate(sub.get("steps", []), start=1):
                    add_numbered_step(doc, i, s)

                # Plain list
                for item in sub.get("list_items", []):
                    add_plain_bullet(doc, item)

                if sub.get("note"):
                    add_callout(doc, sub["note"], kind="note")

        elif sec["id"] == "comparison":
            add_body(doc, sec["intro"])
            t = sec["table_compare"]
            build_table(doc, t["headers"], t["rows"], first_col_bold=True)
            add_callout(doc, sec["tip"], kind="tip")

        elif sec["id"] == "faq":
            for faq in sec["faqs"]:
                p = doc.add_paragraph()
                set_paragraph_spacing(p, before=4, after=1, line=1.15)
                r0 = p.add_run("• ")
                set_run_font(r0, size=10.5, color=ACCENT)
                r1 = p.add_run(faq["q"] + " ")
                set_run_font(r1, size=10.5, bold=True, color=NEAR_BLACK)
                r2 = p.add_run(faq["a"])
                set_run_font(r2, size=10.5, color=NEAR_BLACK)

    # Footer line
    sp = doc.add_paragraph()
    set_paragraph_spacing(sp, before=14, after=4, line=1.0)
    add_bottom_border(sp, color="D0D7E2", sz="6")

    foot = doc.add_paragraph()
    set_paragraph_spacing(foot, before=4, after=0, line=1.1, align=WD_ALIGN_PARAGRAPH.CENTER)
    fr = foot.add_run(data["footer"])
    set_run_font(fr, size=8.5, italic=True, color=MUTED)

    doc.save(str(OUT))
    print(f"Saved: {OUT}")
    print(f"Size: {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    build()
