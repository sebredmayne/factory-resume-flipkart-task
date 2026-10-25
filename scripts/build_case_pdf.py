"""Builds Factory-Resume-Product-Case.pdf, the 2-page product case.

It's written as a walkthrough of the prototype: the problem in plain terms,
then one step per screen, with screenshots from scripts/case-assets/.
Figures come from the prototype's engine on its synthetic data (5-day
outlook on the Overview page). If the data or engine change, retake the
screenshots and update NUMBERS below.

    python3 scripts/build_case_pdf.py
"""

from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = Path(__file__).resolve().parent / "case-assets"
OUT = ROOT / "Factory-Resume-Product-Case.pdf"

NUMBERS = {
    "essential_on_time_plan": "100%",
    "essential_on_time_bau": "59%",
    "shipped_uplift": "37%",
    "spend_per_extra_unit": "Rs 14",
    "day1_plan": "2,800",
    "day1_bau": "2,200",
    "day1_essentials_plan": "1,900",
    "redeployed": "9",
}

INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#4b5563")
ACCENT = colors.HexColor("#1d4ed8")
TINT = colors.HexColor("#eef2ff")
RULE = colors.HexColor("#d1d5db")

WIDTH = 7.3 * inch

base = ParagraphStyle("base", fontName="Helvetica", fontSize=9.2, leading=12.3, textColor=INK)
muted = ParagraphStyle("muted", parent=base, textColor=MUTED, fontSize=8.4, leading=11)
title = ParagraphStyle("title", parent=base, fontName="Helvetica-Bold", fontSize=19, leading=22)
subtitle = ParagraphStyle("subtitle", parent=base, fontSize=10.5, leading=13.5, textColor=MUTED)
h2 = ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=10.8, leading=13.5, spaceBefore=7, spaceAfter=2)
step = ParagraphStyle("step", parent=h2, textColor=ACCENT)
bullet = ParagraphStyle("bullet", parent=base, leftIndent=11, bulletIndent=1, spaceAfter=1)
cell = ParagraphStyle("cell", parent=base, fontSize=8.8, leading=11.4)


def P(text, style=base):
    return Paragraph(text, style)


def bullets(items):
    return [Paragraph(t, bullet, bulletText="•") for t in items]


def shot(name, width):
    path = ASSETS / f"{name}.jpg"
    w, h = PILImage.open(path).size
    img = Image(str(path), width=width, height=width * h / w)
    framed = Table([[img]], colWidths=[width + 2])
    framed.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return framed


def boxed(flowables):
    t = Table([[flowables]], colWidths=[WIDTH])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TINT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def two_col(left, right, left_w=2.55):
    t = Table([[left, right]], colWidths=[left_w * inch, WIDTH - left_w * inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, -1), 10),
        ("RIGHTPADDING", (1, 0), (1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def walkthrough_step(number, heading, text, image, image_width=4.6):
    left = [P(f"Step {number}", step), P(f"<b>{heading}</b>"), Spacer(1, 3), *text]
    return KeepTogether([two_col(left, shot(image, image_width * inch)), Spacer(1, 8)])


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.6 * inch, 0.4 * inch, "Factory Resume · product case · all figures from the working prototype, on synthetic data")
    canvas.drawRightString(letter[0] - 0.6 * inch, 0.4 * inch, f"{doc.page} / 2")
    canvas.restoreState()


n = NUMBERS
story = [
    P("Factory Resume", title),
    P("Half the population disappears overnight. How do essentials still reach the people who are left?", subtitle),
    Spacer(1, 7),
    boxed([
        P("<b>The idea in 30 seconds</b>"),
        Spacer(1, 2),
        P(
            "When half the people vanish, half the warehouse staff and half the customers vanish too. So the "
            "problem isn't &ldquo;not enough capacity&rdquo;. It's that <b>the wrong people are left, people need "
            "different things, and help arrives late</b>. Factory Resume is a tool for the warehouse operations "
            "manager. Every morning it builds a plan: who works where, which partners to call, and which orders "
            "ship first. Each evening it learns from what actually happened."
        ),
        Spacer(1, 3),
        P(
            f"<b>Result in the prototype (5 days):</b> {n['essential_on_time_plan']} of essential items delivered "
            f"on time vs. {n['essential_on_time_bau']} without the tool, and {n['shipped_uplift']} more orders "
            f"shipped overall, for {n['spend_per_extra_unit']} of partner cost per extra item."
        ),
    ]),
    P("The situation the prototype models", h2),
    *bullets([
        "A personal-care and hygiene brand (fictional) with warehouses in Bengaluru and Pune. "
        "<b>60 of its 120 staff are left</b>, and couriers are down by half.",
        "<b>The wrong people are left:</b> the packing team lost the most people. Orders can only go out as fast "
        "as the slowest step, so packing now holds everything up.",
        "<b>Needs have changed:</b> people are stocking up on soap, hand wash and sanitary pads, and have "
        "stopped buying face serum. Shipping orders in date order would still send lip balm before soap.",
        "<b>Help is slow:</b> outside partners need 6 to 48 hours to start.",
    ]),
    P("Walkthrough: one day with Factory Resume", h2),
    walkthrough_step(
        1,
        "See the whole picture (Overview)",
        [
            P(
                "The manager first sees what the plan achieves against &ldquo;business as usual&rdquo;: everyone "
                "stays in their usual job, no partners, and orders ship by due date."
            ),
            Spacer(1, 3),
            P(
                "Both are calculated by the same engine on the same data, so the comparison is measured, not claimed.",
                muted,
            ),
        ],
        "compare",
    ),
    walkthrough_step(
        2,
        "Check in and get today's plan (Daily loop)",
        [
            P(
                "At 7am the manager enters who actually turned up. The plan rebuilds instantly from that headcount, "
                "not from the roster."
            ),
            Spacer(1, 3),
            P(
                "The plan names the bottleneck (packing), the people to move, and the partners to call now so "
                "they're ready tomorrow. Every order shows why it's ranked where it is, e.g. "
                "&ldquo;Essential &middot; due in 2d&rdquo;.",
            ),
        ],
        "today",
    ),
    PageBreak(),
    walkthrough_step(
        3,
        "Move people to where they're needed (Workforce)",
        [
            P(
                "Some workers can cover a second job: a picker can pack at 60% speed after 2 hours of training. The "
                "tool moves one person at a time to the bottleneck, and only when that actually speeds up the line."
            ),
            Spacer(1, 3),
            P(
                f"Day 1: {n['redeployed']} of 60 people are moved, so <b>{n['day1_plan']} items ship instead of "
                f"{n['day1_bau']}</b>. Quality checkers are never moved, and no one untrained is moved into quality checks."
            ),
        ],
        "workforce",
    ),
    P("Step 4 &middot; Call partners at the right time (Outsourcing)", step),
    P(
        "Partners only count for the hours they're actually working. A partner that needs 24 hours to start can't help "
        "today, so the tool says &ldquo;request it now for tomorrow&rdquo;. It also won't pay for extra picking while "
        "packing is the bottleneck, because those items would just pile up."
    ),
    P("Step 5 &middot; Ship what matters first (Recovery plan)", step),
    P(
        "Each product is tagged essential, everyday or non-essential. Essentials go first, then whatever is about "
        "to miss its date. On Day 1 the plan ships "
        f"{n['day1_essentials_plan']} essential items; shipping by due date alone would ship none. The manager approves "
        "the plan, and nothing is booked automatically."
    ),
    Spacer(1, 4),
    walkthrough_step(
        6,
        "Close the day, learn, and look ahead",
        [
            P(
                "At the end of the shift the manager enters what each team actually did. If packing hit only 80% "
                "of plan, tomorrow's plan assumes a slower pace. Plan accuracy is tracked every day."
            ),
            Spacer(1, 3),
            P(
                "<b>Key insight:</b> the bottleneck moves every day: packing, then picking, then Pune's couriers, "
                "then stock. A plan made once would be fixing the wrong problem by Day 3. The Scenarios page tests "
                "what happens if things get worse."
            ),
        ],
        "days",
    ),
    P("Why it's built this way", h2),
    *bullets([
        "<b>Simple rules over a black box.</b> A manager has to defend every call to leadership, so every move "
        "the tool makes can be explained in one sentence.",
        "<b>A person stays in charge.</b> The tool recommends; the manager approves.",
        "<b>Uses data teams already have:</b> the order list, the staff roster, and stock levels. The riskiest "
        "assumption is that rosters record who can do which second job. I'd test that first with real managers.",
    ]),
    P("How success is measured", h2),
    P(
        "<b>Main goal:</b> essential items delivered by their promised date. "
        "<b>Trust:</b> the share of plans the manager approves without changes, and plan accuracy (shipped vs. planned). "
        "<b>Cost:</b> partner spend per extra item shipped. "
        "<b>Safety checks:</b> no rise in quality issues from moved staff, and customers told about delays before "
        "their date."
    ),
]

doc = SimpleDocTemplate(
    str(OUT),
    pagesize=letter,
    leftMargin=0.6 * inch,
    rightMargin=0.6 * inch,
    topMargin=0.5 * inch,
    bottomMargin=0.6 * inch,
    title="Factory Resume — Product Case",
    author="Factory Resume",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(f"Wrote {OUT}")
