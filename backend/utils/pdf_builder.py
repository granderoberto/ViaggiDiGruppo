from __future__ import annotations

import re
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import CondPageBreak, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


"""
Builder PDF dei viaggi (layout report scolastico migliorato).

- Input flessibile: i viaggi non sono uniformi, quindi ogni sezione è opzionale.
- Obiettivo: generare sempre un PDF leggibile anche con dati parziali/mancanti.
- Strategia: helper `safe`, format date/valuta e sezioni condizionali.
"""


def safe(text: object, *, default: str = "-") -> str:
    if text is None:
        return default
    value = str(text).strip()
    return value if value else default


def format_date_ita(value: object) -> str:
    if value is None:
        return "-"
    text = str(value).strip()
    if not text:
        return "-"

    try:
        parsed = datetime.strptime(text, "%Y-%m-%d")
        return parsed.strftime("%d/%m/%Y")
    except ValueError:
        return text


def money(amount: object, currency: object = "EUR") -> str:
    curr = safe(currency, default="EUR")
    try:
        value = float(amount)
        return f"{value:.2f} {curr}"
    except (TypeError, ValueError):
        return f"0.00 {curr}"


def _slugify(value: object, fallback: str) -> str:
    raw = safe(value, default=fallback).lower()
    slug = re.sub(r"[^a-z0-9]+", "_", raw)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug or fallback


def build_trip_filename(trip: dict) -> str:
    destination = trip.get("destination") if isinstance(trip.get("destination"), dict) else {}
    city = destination.get("city") if isinstance(destination, dict) else "citta"
    start_date = trip.get("startDate") or "data"
    return f"Viaggio_{_slugify(city, 'citta')}_{_slugify(start_date, 'data')}.pdf"


def build_table(data: list[list[object]], col_widths: list[float], table_style: TableStyle | None = None) -> Table:
    table = Table(data, colWidths=col_widths, repeatRows=1)

    base_style = TableStyle(
        [
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.HexColor("#d1d5db")),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e5e7eb")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
    )

    for row_idx in range(1, len(data)):
        if row_idx % 2 == 0:
            base_style.add("BACKGROUND", (0, row_idx), (-1, row_idx), colors.HexColor("#fafafa"))

    table.setStyle(base_style)
    if table_style is not None:
        table.setStyle(table_style)

    return table


class _NumberedCanvas(canvas.Canvas):
    """
    Canvas custom con footer su ogni pagina.

    Salva gli stati pagina per stampare numerazione `pagina X/Y` e timestamp
    di generazione alla fine, quando il totale pagine è noto.
    """

    def __init__(self, *args, generated_on: str, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict] = []
        self.generated_on = generated_on

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(total_pages)
            super().showPage()
        super().save()

    def _draw_footer(self, total_pages: int):
        width, _ = A4
        page_text = f"Pagina {self._pageNumber}/{total_pages}"
        generated_text = f"Generato il {self.generated_on}"

        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#6b7280"))
        self.drawString(20 * mm, 12 * mm, generated_text)
        self.drawRightString(width - 20 * mm, 12 * mm, page_text)


def build_trip_pdf(trip: dict) -> bytes:
    """
    Genera il PDF completo del viaggio e restituisce bytes pronti al download.

    Punti delicati:
    - Paginazione: `CondPageBreak` evita intestazioni isolate a fondo pagina.
    - Dati economici: budget e spese possono avere valute diverse o campi assenti.
    - Robustezza: nessuna sezione è obbligatoria; fallback testuali garantiti.
    """

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TripTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=22,
        textColor=colors.HexColor("#111827"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#374151"),
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#111827"),
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#111827"),
    )
    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#4b5563"),
    )

    destination = trip.get("destination") if isinstance(trip.get("destination"), dict) else {}
    city = destination.get("city") if isinstance(destination, dict) else "-"
    country = destination.get("country") if isinstance(destination, dict) else "-"
    title = safe(trip.get("title"), default="Viaggio")
    status = safe(trip.get("status"), default="PLANNED").upper()
    start_date = format_date_ita(trip.get("startDate"))
    end_date = format_date_ita(trip.get("endDate"))
    generated_on = datetime.now().strftime("%d/%m/%Y %H:%M")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=45 * mm,
        bottomMargin=20 * mm,
        title=title,
    )

    width, height = A4

    def draw_header(pdf_canvas: canvas.Canvas, document: SimpleDocTemplate):
        pdf_canvas.saveState()
        pdf_canvas.setFillColor(colors.HexColor("#111827"))
        pdf_canvas.setFont("Helvetica-Bold", 18)
        pdf_canvas.drawString(20 * mm, height - 20 * mm, title)

        subtitle = f"Destinazione: {safe(city)}, {safe(country)}   |   Date: {start_date} - {end_date}"
        pdf_canvas.setFont("Helvetica", 10)
        pdf_canvas.setFillColor(colors.HexColor("#4b5563"))
        pdf_canvas.drawString(20 * mm, height - 27 * mm, subtitle)

        badge_text = f"STATO: {status}"
        badge_width = max(34 * mm, (len(badge_text) * 2.4 + 14) * mm / 2.834)
        badge_x = width - 20 * mm - badge_width
        badge_y = height - 26 * mm
        pdf_canvas.setFillColor(colors.HexColor("#e5e7eb"))
        pdf_canvas.roundRect(badge_x, badge_y, badge_width, 8 * mm, 2 * mm, fill=1, stroke=0)
        pdf_canvas.setFillColor(colors.HexColor("#111827"))
        pdf_canvas.setFont("Helvetica-Bold", 9)
        pdf_canvas.drawCentredString(badge_x + badge_width / 2, badge_y + 2.8 * mm, badge_text)

        pdf_canvas.setStrokeColor(colors.HexColor("#d1d5db"))
        pdf_canvas.setLineWidth(0.8)
        pdf_canvas.line(20 * mm, height - 32 * mm, width - 20 * mm, height - 32 * mm)
        pdf_canvas.restoreState()

    story: list = []

    def add_section_header(text: str):
        story.append(CondPageBreak(35 * mm))
        story.append(KeepTogether([Paragraph(text, section_style), Spacer(1, 2 * mm)]))

    overview_items: list[list[object]] = []
    if city or country:
        overview_items.append([Paragraph("Destinazione", small_style), Paragraph(f"{safe(city)}, {safe(country)}", body_style)])
    if start_date or end_date:
        overview_items.append([Paragraph("Date", small_style), Paragraph(f"{start_date} - {end_date}", body_style)])
    description = safe(trip.get("description"), default="")
    if description:
        overview_items.append([Paragraph("Descrizione", small_style), Paragraph(description, body_style)])

    if overview_items:
        add_section_header("Panoramica")
        overview_table = Table(overview_items, colWidths=[42 * mm, 128 * mm])
        overview_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d1d5db")),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f9fafb")),
                ]
            )
        )
        story.append(overview_table)
        story.append(Spacer(1, 5 * mm))

    participants = trip.get("participants") if isinstance(trip.get("participants"), list) else []
    if participants:
        add_section_header("Partecipanti")
        participant_rows: list[list[object]] = []
        for participant in participants:
            if isinstance(participant, dict):
                name = safe(participant.get("name"), default="Senza nome")
            else:
                name = safe(participant, default="Senza nome")
            participant_rows.append([Paragraph(f"• {name}", body_style)])

        participants_box = Table(participant_rows, colWidths=[170 * mm])
        participants_box.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d1d5db")),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(participants_box)
        story.append(Spacer(1, 5 * mm))

    activities = trip.get("activities") if isinstance(trip.get("activities"), list) else []
    route = trip.get("route") if isinstance(trip.get("route"), list) else []
    if activities or route:
        add_section_header("Attività / Tappe")
        rows: list[list[object]] = [["Data", "Titolo", "Tipo", "Fatto"]]

        for activity in activities:
            if not isinstance(activity, dict):
                continue
            done_value = "✓" if bool(activity.get("done")) else "☐"
            rows.append(
                [
                    Paragraph(safe(format_date_ita(activity.get("date"))), body_style),
                    Paragraph(safe(activity.get("title"), default="Attività"), body_style),
                    Paragraph(safe(activity.get("type"), default="-"), body_style),
                    Paragraph(done_value, body_style),
                ]
            )

        for step in route:
            if not isinstance(step, dict):
                continue
            done_value = "✓" if bool(step.get("done")) else "☐"
            rows.append(
                [
                    Paragraph("-", body_style),
                    Paragraph(safe(step.get("label"), default="Tappa"), body_style),
                    Paragraph("Tappa", body_style),
                    Paragraph(done_value, body_style),
                ]
            )

        if len(rows) > 1:
            activities_table = build_table(rows, [26 * mm, 84 * mm, 36 * mm, 24 * mm])
            story.append(activities_table)
            story.append(Spacer(1, 5 * mm))

    expenses = trip.get("expenses") if isinstance(trip.get("expenses"), list) else []
    if expenses:
        add_section_header("Spese")
        rows: list[list[object]] = [["Voce", "Importo", "Pagato da", "Categoria"]]
        totals_by_currency: dict[str, float] = {}

        for expense in expenses:
            if not isinstance(expense, dict):
                continue

            label = safe(expense.get("label"), default="Spesa")
            paid_by = safe(expense.get("paidBy"), default="-")
            category = safe(expense.get("category"), default="-")
            currency = safe(expense.get("currency"), default="EUR")

            amount = expense.get("amount")
            try:
                numeric = float(amount)
            except (TypeError, ValueError):
                numeric = 0.0

            totals_by_currency[currency] = totals_by_currency.get(currency, 0.0) + numeric

            rows.append(
                [
                    Paragraph(label, body_style),
                    Paragraph(money(numeric, currency), body_style),
                    Paragraph(paid_by, body_style),
                    Paragraph(category, body_style),
                ]
            )

        if len(rows) > 1:
            expenses_table = build_table(rows, [54 * mm, 35 * mm, 40 * mm, 41 * mm])
            story.append(expenses_table)

            totals_parts = [f"{value:.2f} {curr}" for curr, value in sorted(totals_by_currency.items())]
            total_text = "Totale spese: " + (" | ".join(totals_parts) if totals_parts else "0.00 EUR")
            story.append(Spacer(1, 2.5 * mm))
            story.append(Paragraph(total_text, ParagraphStyle("Total", parent=body_style, fontName="Helvetica-Bold")))
            story.append(Spacer(1, 5 * mm))

    notes = trip.get("notes") if isinstance(trip.get("notes"), list) else []

    budget = trip.get("budget") if isinstance(trip.get("budget"), dict) else None
    budget_currency = safe(budget.get("currency") if budget else "EUR", default="EUR")
    try:
        budget_amount = float(budget.get("amount")) if budget else None
    except (TypeError, ValueError):
        budget_amount = None

    total_expenses = 0.0
    for expense in expenses:
        if not isinstance(expense, dict):
            continue

        try:
            amount = float(expense.get("amount"))
        except (TypeError, ValueError):
            continue

        expense_currency = safe(expense.get("currency"), default="EUR")
        if budget_amount is not None and expense_currency != budget_currency:
            continue

        total_expenses += amount

    if budget_amount is not None or expenses:
        add_section_header("Budget & Costi")
        rows: list[list[object]] = [
            [Paragraph("Budget", body_style), Paragraph(money(budget_amount, budget_currency) if budget_amount is not None else "-", body_style)],
            [Paragraph("Totale spese", body_style), Paragraph(money(total_expenses, budget_currency), body_style)],
        ]

        if budget_amount is not None:
            diff = budget_amount - total_expenses
            rows.append([Paragraph("Differenza", body_style), Paragraph(money(diff, budget_currency), body_style)])

        budget_table = Table(rows, colWidths=[52 * mm, 118 * mm])
        budget_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d1d5db")),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f9fafb")),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ]
            )
        )
        story.append(budget_table)
        story.append(Spacer(1, 5 * mm))

    if notes:
        add_section_header("Note")
        note_rows: list[list[object]] = []
        for note in notes:
            content = safe(note, default="")
            if content:
                note_rows.append([Paragraph(f"• {content}", body_style)])

        if note_rows:
            notes_box = Table(note_rows, colWidths=[170 * mm])
            notes_box.setStyle(
                TableStyle(
                    [
                        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d1d5db")),
                        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            story.append(notes_box)
            story.append(Spacer(1, 4 * mm))

    if not story:
        story.append(Paragraph("Nessun contenuto disponibile per questo viaggio.", body_style))

    doc.build(
        story,
        onFirstPage=draw_header,
        onLaterPages=draw_header,
        canvasmaker=lambda *args, **kwargs: _NumberedCanvas(*args, generated_on=generated_on, **kwargs),
    )

    buffer.seek(0)
    return buffer.read()
