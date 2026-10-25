"""Builds Factory-Resume-Product-Case.pdf, the 2-page product case.

Figures quoted here come from the prototype's engine on its synthetic
fixture data (5-day outlook from the Overview page). If the fixtures or the
engine change, re-read them from the app and update NUMBERS below.

    python3 scripts/build_case_pdf.py
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parent.parent / "Factory-Resume-Product-Case.pdf"

NUMBERS = {
    "staff": "60 of ~120",
    "essential_on_time_plan": "100%",
    "essential_on_time_bau": "59%",
    "essential_due": "8,380",
    "shipped_plan": "15,120",
    "shipped_bau": "11,000",
    "shipped_uplift": "+37%",
    "backlog_plan": "4,680",
    "backlog_bau": "8,800",
    "spend": "Rs 56,492",
    "spend_per_extra_unit": "Rs 14",
    "day1_plan": "2,800",
    "day1_bau": "2,200",
    "day1_essentials_plan": "1,900",
    "day1_essentials_bau": "0",
    "redeployed": "9",
}

INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#4b5563")
RULE = colors.HexColor("#d1d5db")
TINT = colors.HexColor("#f3f4f6")

base = ParagraphStyle("base", fontName="Helvetica", fontSize=9.2, leading=12.4, textColor=INK, alignment=TA_LEFT)
small = ParagraphStyle("small", parent=base, fontSize=8.2, leading=10.6, textColor=MUTED)
title = ParagraphStyle("title", parent=base, fontName="Helvetica-Bold", fontSize=19, leading=22)
subtitle = ParagraphStyle("subtitle", parent=base, fontSize=10.5, leading=13.5, textColor=MUTED)
h2 = ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=11, leading=14, spaceBefore=7, spaceAfter=2.5)
bullet = ParagraphStyle("bullet", parent=base, leftIndent=11, bulletIndent=1, spaceAfter=1.5)
cell = ParagraphStyle("cell", parent=base, fontSize=8.6, leading=11)
cell_bold = ParagraphStyle("cell_bold", parent=cell, fontName="Helvetica-Bold")
answer = ParagraphStyle("answer", parent=base, fontSize=9.8, leading=13.4)


def P(text, style=base):
    return Paragraph(text, style)


def bullets(items):
    return [Paragraph(t, bullet, bulletText="•") for t in items]


def boxed(flowables, background=TINT):
    t = Table([[flowables]], colWidths=[7.3 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return t


def grid(rows, widths, header=True):
    data = [[P(c, cell_bold if (header and i == 0) else cell) for c in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=[w * inch for w in widths])
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), TINT))
    t.setStyle(TableStyle(style))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(
        0.6 * inch,
        0.4 * inch,
        "Factory Resume — product case · figures from the prototype's engine on synthetic data · see README.md",
    )
    canvas.drawRightString(letter[0] - 0.6 * inch, 0.4 * inch, f"{doc.page} / 2")
    canvas.restoreState()


n = NUMBERS
story = [
    P("Factory Resume", title),
    P("The day after half the population disappears: keeping essentials moving", subtitle),
    Spacer(1, 7),
    boxed(
        [
            P(
                "<b>In one line:</b> Factory Resume rebuilds a fulfilment centre's plan every morning "
                "&mdash; who works where, which partners to bring in, which orders ship &mdash; so that "
                "essentials reach the people who are left. In the prototype's 5-day outlook it ships "
                f"<b>{n['essential_on_time_plan']} of essential units on time vs. {n['essential_on_time_bau']}</b> "
                f"for business as usual, and <b>{n['shipped_uplift']} more units</b> overall, for "
                f"{n['spend_per_extra_unit']} of partner spend per extra unit.",
                answer,
            )
        ]
    ),
    P("Why this problem, out of everything that breaks", h2),
    P(
        "When half the population vanishes overnight, hospitals, utilities and food supply all fail at "
        "once. I focused on <b>fulfilment &mdash; how essentials physically reach households</b> &mdash; for "
        "three reasons: every other recovery depends on it; its inputs (orders, rosters, stock) are already "
        "digital, so software can help within hours rather than months; and one manager's decisions reach "
        "thousands of homes. The closest real precedent is a pandemic lockdown, when e-commerce in several "
        "countries, India included, was briefly restricted to essential goods while warehouses ran short-staffed."
    ),
    P("What actually breaks on day one", h2),
    P(
        "The intuitive framing &mdash; &ldquo;half the staff, so half the capacity&rdquo; &mdash; is wrong, "
        "because <b>demand drops too</b>. Half the customers are gone. The real problem is <b>mismatch</b>:"
    ),
    *bullets(
        [
            "<b>The wrong people are left.</b> Packing lost most of its team, picking lost the fewest. The line "
            "ships only as fast as its slowest step, and today nobody is deciding who should move.",
            "<b>Needs have shifted.</b> The customers who are left stockpile hand wash and sanitary pads, and stop "
            "buying serums. A first-due-first-shipped floor still ships the lip balm due today before the soap due tomorrow.",
            "<b>Help arrives late.</b> Partners need 6&ndash;48 hours to activate, and couriers are halved too.",
            "<b>Any plan is wrong by noon.</b> Who shows up, how fast people work in unfamiliar roles, and what "
            "stock lands all change daily.",
        ]
    ),
    P(
        "<b>Primary user:</b> the operations manager of a fulfilment network (here, a fictional personal-care "
        "and hygiene brand with Bengaluru and Pune centres and "
        f"{n['staff']} staff left). They are accountable for what ships and must defend each call to leadership."
    ),
    P("The solution: three structural ideas", h2),
    grid(
        [
            ["Idea", "What the engine does", "Guardrail"],
            [
                "<b>Redeploy, don't just allocate</b>",
                "Each team has cross-skills (a picker can pack at 60% speed after 2h of ramp-up). The engine moves "
                "one worker at a time from the best-covered task to the bottleneck, but only when that lifts the "
                "weaker of the two, counting the speed and ramp-up loss.",
                "No one is moved into certified work (quality inspection, inventory exceptions), and those teams "
                "are never moved out.",
            ],
            [
                "<b>Priority from need, not a label</b>",
                "Each SKU is tagged essential, everyday or discretionary. Priority = need, then due date, with a "
                "one-line reason (&ldquo;Essential &middot; due in 1d&rdquo;).",
                "Tags are an operator policy input, never inferred by the engine.",
            ],
            [
                "<b>A daily loop, not a one-off plan</b>",
                "Check in who showed up &rarr; plan &rarr; end-of-shift actuals &rarr; recalibrate productivity "
                "&rarr; tomorrow's plan. Backlog rolls over and re-ranks; new orders arrive at the shifted demand.",
                "Partners count only for the hours they're live, and volume is bought only up to what the rest "
                "of the line can ship.",
            ],
        ],
        [1.35, 3.85, 2.1],
    ),
    PageBreak(),
    P("A morning with Factory Resume", h2),
    *bullets(
        [
            "<b>7:00 &middot; Check-in.</b> The manager enters who actually arrived. The plan rebuilds from that "
            "headcount, not the roster.",
            f"<b>7:05 &middot; Plan.</b> Packing is the bottleneck, and no packing partner can start until tomorrow. "
            f"The engine moves {n['redeployed']} of 60 people across tasks. Day 1 ships {n['day1_plan']} units "
            f"vs. {n['day1_bau']} with everyone on their own task, and {n['day1_essentials_plan']} essential "
            f"units vs. {n['day1_essentials_bau']} under first-due-first.",
            "<b>7:10 &middot; Request.</b> It flags QuickPack (24h activation) and ValleyWorks (48h) to request "
            "now, and explains why buying picking capacity today would be waste.",
            "<b>19:00 &middot; Close.</b> Packing reports 80% of plan. Plan accuracy is logged, packing productivity "
            "is nudged to 90%, and tomorrow's plan starts from that.",
        ]
    ),
    P("MVP scope &mdash; and the tradeoffs behind it", h2),
    *bullets(
        [
            "<b>An explainable heuristic over an optimal solver.</b> A manager won't stake their job on a black box; "
            "every move the engine makes fits in one sentence. The cost: the plan isn't guaranteed optimal.",
            "<b>A human approves; nothing books automatically.</b> Partner requests and redeployments are "
            "recommendations. Booking automatically saves minutes, but one wrong call costs trust.",
            "<b>Data comes from what teams already keep.</b> MVP input is the order export, the roster with "
            "cross-skills, and stock, not WMS integrations. <i>This is the riskiest assumption:</i> rosters may "
            "not record cross-skills today.",
            "<b>The daily loop ships in v1</b>, because re-planning when things get worse is part of day one, "
            "not an add-on. Live integrations, payroll and automatic booking are cut.",
        ]
    ),
    P("Success metrics", h2),
    grid(
        [
            ["Type", "Metric", "Why this one"],
            ["North star", "Essential units shipped by their promised date", "What the people who are left actually need; volume alone could be gamed by shipping lip balm."],
            ["Input", "Time from check-in to approved plan; share of recommendations approved without edits", "Speed matters only if the manager trusts the plan enough to act on it."],
            ["Plan accuracy", "Shipped &divide; planned, per day", "Measured by the loop itself. If it's low, the plan is fiction and the recalibration is the fix."],
            ["Efficiency", "Partner spend per extra unit shipped", "Makes outsourcing a priced decision before budget is committed."],
            ["Guardrails", "Quality incidents in redeployed roles; partner over-commitment; delayed customers told before their date", "Prevents winning the north star by cutting corners."],
        ],
        [1.0, 2.6, 3.7],
    ),
    Spacer(1, 6),
    KeepTogether(
        [
            P(
                "<b>Prototype result, 5-day outlook.</b> Same engine and same synthetic data. &ldquo;Business as usual&rdquo; = "
                "everyone on their own task, no partners, first-due-first-shipped.",
                small,
            ),
            Spacer(1, 2),
            grid(
                [
                    ["", "With the plan", "Business as usual"],
                    [f"Essential units on time (of {n['essential_due']} due)", n["essential_on_time_plan"], n["essential_on_time_bau"]],
                    ["Units shipped", n["shipped_plan"], n["shipped_bau"]],
                    ["Backlog left after Day 5", n["backlog_plan"], n["backlog_bau"]],
                    ["Partner spend", n["spend"], "Rs 0"],
                ],
                [3.3, 2.0, 2.0],
            ),
        ]
    ),
    P("What the prototype taught me", h2),
    P(
        "<b>The bottleneck moves.</b> Packing binds on Day 1, picking on Day 2 once a packing partner is live, "
        "Pune's couriers on Days 3&ndash;4, and stock by Day 5. A plan made once on day one would be optimising the "
        "wrong constraint by Day 3, which is why the product is a loop. Next bets, in order: test whether managers "
        "can supply cross-skill data in under an hour; add courier re-routing between centres; and turn the "
        "&ldquo;stock&rdquo; constraint into replenishment requests."
    ),
]

doc = SimpleDocTemplate(
    str(OUT),
    pagesize=letter,
    leftMargin=0.6 * inch,
    rightMargin=0.6 * inch,
    topMargin=0.55 * inch,
    bottomMargin=0.6 * inch,
    title="Factory Resume — Product Case",
    author="Factory Resume",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(f"Wrote {OUT}")
