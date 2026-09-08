import datetime
import random
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import LineChart, Reference
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

wb = Workbook()

# ---------- Style helpers ----------
FONT_NAME = "Arial"
TITLE_FONT = Font(name=FONT_NAME, size=14, bold=True, color="FFFFFF")
SECTION_FONT = Font(name=FONT_NAME, size=11, bold=True, color="1F4E78")
LABEL_FONT = Font(name=FONT_NAME, size=10, bold=False)
INPUT_FONT = Font(name=FONT_NAME, size=10, bold=False, color="0000FF")
FORMULA_FONT = Font(name=FONT_NAME, size=10, bold=False, color="000000")
HEADER_FONT = Font(name=FONT_NAME, size=10, bold=True, color="FFFFFF")
NOTE_FONT = Font(name=FONT_NAME, size=9, italic=True, color="808080")
BIG_OUT_FONT = Font(name=FONT_NAME, size=13, bold=True, color="1F4E78")

TITLE_FILL = PatternFill("solid", fgColor="1F4E78")
HEADER_FILL = PatternFill("solid", fgColor="4472C4")
INPUT_FILL = PatternFill("solid", fgColor="FFFFCC")
SECTION_FILL = PatternFill("solid", fgColor="D9E1F2")
OUT_FILL = PatternFill("solid", fgColor="E2EFDA")

THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def title_row(ws, row, text, span=6):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row=row, column=1, value=text)
    c.font = TITLE_FONT
    c.fill = TITLE_FILL
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[row].height = 22


def section_row(ws, row, text, span=6):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row=row, column=1, value=text)
    c.font = SECTION_FONT
    c.fill = SECTION_FILL
    ws.row_dimensions[row].height = 16


def label_input(ws, row, label, value, fmt=None, note=None, col_label=1, col_value=2):
    lc = ws.cell(row=row, column=col_label, value=label)
    lc.font = LABEL_FONT
    vc = ws.cell(row=row, column=col_value, value=value)
    vc.font = INPUT_FONT
    vc.fill = INPUT_FILL
    vc.border = BORDER
    if fmt:
        vc.number_format = fmt
    if note:
        nc = ws.cell(row=row, column=col_value + 1, value=note)
        nc.font = NOTE_FONT
    return vc


def label_formula(ws, row, label, formula, fmt=None, note=None, col_label=1, col_value=2):
    lc = ws.cell(row=row, column=col_label, value=label)
    lc.font = LABEL_FONT
    vc = ws.cell(row=row, column=col_value, value=formula)
    vc.font = FORMULA_FONT
    vc.border = BORDER
    if fmt:
        vc.number_format = fmt
    if note:
        nc = ws.cell(row=row, column=col_value + 1, value=note)
        nc.font = NOTE_FONT
    return vc


PCT0 = "0%"
PCT1 = "0.0%"
USD0 = "$#,##0"

# =========================================================================
# SHEET: Instructions
# =========================================================================
ws_i = wb.active
ws_i.title = "Instructions"
ws_i.sheet_view.showGridLines = False
for col, w in zip("ABCDEFG", [2, 100, 2, 2, 2, 2, 2]):
    ws_i.column_dimensions[col].width = w
title_row(ws_i, 1, "Paid Search Campaign Control System", span=2)
r = 3
instructions = [
    ("How this workbook is used (daily, ~2 minutes):", True),
    ("1. Open the 'Daily Data' tab. Paste today's export as a new row at the bottom "
     "(Date, Spend, Revenue-to-Date, Orders).", False),
    ("2. Open 'Inputs' and update: Today's Date, Campaign Status, Current Platform Target ROAS, "
     "Current Daily Budget, and Last Change Date/Type if you changed anything yesterday.", False),
    ("3. Open 'Decision'. Look at the chart (raw vs. lag-adjusted ROAS vs. target/breakeven), "
     "then read ACTION / VALUE / REASON / REVIEW CADENCE / WAIT PERIOD.", False),
    ("4. Make the change described in VALUE (if any). Then update the 'Last Change Date' and "
     "'Last Change Type' fields on Inputs so the wait-period logic knows a change was made.", False),
    ("5. Come back on the date/condition given in REVIEW CADENCE. Repeat.", False),
    ("", False),
    ("What the system is doing under the hood:", True),
    ("- Recently-spent money hasn't finished converting yet (see the 'Lag Table' tab). The system "
     "grosses up each day's revenue by how much of its revenue is typically observed by its age, "
     "then compares that AGE-ADJUSTED ROAS to the 220% required target and the ~200% breakeven "
     "ROAS - never raw, same-day reported ROAS.", False),
    ("- It only acts on a rolling 14-day (or 30-day fallback) window with at least 30 matured "
     "orders, so single noisy days can't trigger a change. A 3-day fast window exists purely as a "
     "safety net to catch a real, acute breakeven breach sooner.", False),
    ("- After any Target ROAS or Budget change, it holds (no new change) until at least 7 days AND "
     "30 new orders have accumulated, so the bidding algorithm has time to relearn.", False),
    ("- Every output cell is a formula, not a hardcoded value. Edit any yellow cell on 'Inputs' or "
     "add rows to 'Daily Data' and every downstream number recalculates.", False),
    ("", False),
    ("Tabs in this workbook:", True),
    ("Inputs        - the ~10 things you touch during a normal review, plus system constants "
     "you set once and rarely revisit.", False),
    ("Lag Table     - the conversion-lag curve provided in the case, and the breakeven ROAS it "
     "implies at each spend age.", False),
    ("Daily Data    - paste-in area for daily performance. Age / %Observed / Projected Mature "
     "Revenue are computed automatically.", False),
    ("Trend (Weekly)- optional older, weekly-granularity history for chart context only (not used "
     "in any decision formula, since it is already fully matured).", False),
    ("Engine        - all the window math and gating logic. You shouldn't need to edit this, but "
     "every cell is a visible formula so the logic can be audited and stress-tested.", False),
    ("Decision      - the one page your team actually reads each day.", False),
    ("", False),
    ("A companion 2-page PDF ('Campaign Control System - Decision Framework') explains the same "
     "logic in plain language for anyone who wants the 'why' without opening the spreadsheet.", False),
]
for text, bold in instructions:
    c = ws_i.cell(row=r, column=2, value=text)
    c.font = Font(name=FONT_NAME, size=10, bold=bold, color="1F4E78" if bold else "000000")
    c.alignment = Alignment(wrap_text=True, vertical="top")
    ws_i.row_dimensions[r].height = 28 if len(text) > 90 else (18 if text else 8)
    r += 1

# =========================================================================
# SHEET: Inputs
# =========================================================================
ws_in = wb.create_sheet("Inputs")
ws_in.sheet_view.showGridLines = False
ws_in.column_dimensions["A"].width = 42
ws_in.column_dimensions["B"].width = 16
ws_in.column_dimensions["C"].width = 55

title_row(ws_in, 1, "Inputs — Control Panel", span=3)

section_row(ws_in, 3, "Campaign State  (update every review)", span=3)
R_TODAY = 4
label_input(ws_in, R_TODAY, "Today's Date", datetime.date(2026, 8, 8), fmt="yyyy-mm-dd",
            note="The date you are running this review.")
R_STATUS = 5
label_input(ws_in, R_STATUS, "Campaign Status", "Active",
            note="Active or Paused. Dropdown restricted below.")
dv_status = DataValidation(type="list", formula1='"Active,Paused"', allow_blank=False)
ws_in.add_data_validation(dv_status)
dv_status.add(ws_in.cell(row=R_STATUS, column=2))

R_CUR_TARGET = 6
label_input(ws_in, R_CUR_TARGET, "Current Platform Target ROAS (live setting)", 2.20, fmt=PCT0,
            note="What is literally set in Google Ads right now. The system moves this.")
R_CUR_BUDGET = 7
label_input(ws_in, R_CUR_BUDGET, "Current Daily Budget ($)", 8000, fmt=USD0,
            note="Set materially above normal spend (~$5,000/day) per the case background, "
                 "so it should rarely bind.")
R_LAST_CHANGE_DATE = 8
label_input(ws_in, R_LAST_CHANGE_DATE, "Last Change Date", datetime.date(2026, 7, 20), fmt="yyyy-mm-dd",
            note="Date of the most recent Target ROAS / Budget / Pause / Re-enable / Seasonality action.")
R_LAST_CHANGE_TYPE = 9
label_input(ws_in, R_LAST_CHANGE_TYPE, "Last Change Type", "None",
            note="Drives the wait-period gate. Dropdown restricted below.")
change_types = '"None,Target ROAS Change,Budget Change,Pause,Re-enable,Seasonality Start,Seasonality End"'
dv_change = DataValidation(type="list", formula1=change_types, allow_blank=False)
ws_in.add_data_validation(dv_change)
dv_change.add(ws_in.cell(row=R_LAST_CHANGE_TYPE, column=2))

section_row(ws_in, 11, "Seasonality Override  (optional — fill in only when a known event applies)", span=3)
R_SEASON_ACTIVE = 12
label_input(ws_in, R_SEASON_ACTIVE, "Known Seasonality Event Flagged?", "N",
            note="Y or N. E.g. Black Friday, a announced promo, a known slow week.")
dv_yn = DataValidation(type="list", formula1='"Y,N"', allow_blank=False)
ws_in.add_data_validation(dv_yn)
dv_yn.add(ws_in.cell(row=R_SEASON_ACTIVE, column=2))
R_SEASON_DIR = 13
label_input(ws_in, R_SEASON_DIR, "Direction", "Up",
            note="'Up' = expect higher demand (loosen target). 'Down' = expect lower demand (tighten target).")
dv_dir = DataValidation(type="list", formula1='"Up,Down"', allow_blank=False)
ws_in.add_data_validation(dv_dir)
dv_dir.add(ws_in.cell(row=R_SEASON_DIR, column=2))
R_SEASON_START = 14
label_input(ws_in, R_SEASON_START, "Season Start Date", datetime.date(2026, 12, 20), fmt="yyyy-mm-dd")
R_SEASON_DUR = 15
label_input(ws_in, R_SEASON_DUR, "Season Duration (days)", 10,
            note="Adjustment auto-reverts the day the window ends.")
R_SEASON_SIZE = 16
label_input(ws_in, R_SEASON_SIZE, "Season Adjustment Size (points)", 0.15, fmt=PCT0,
            note="Default step if you have no better historical estimate.")
R_SEASON_BASELINE = 17
label_input(ws_in, R_SEASON_BASELINE, "Pre-Season Baseline Target ROAS", 2.20, fmt=PCT0,
            note="Record the live target the moment you START the season override, so it can revert cleanly.")

section_row(ws_in, 19, "System Constants  (set once — revisit only if business economics change)", span=3)
R_REQ_TARGET = 20
label_input(ws_in, R_REQ_TARGET, "Required (Business) Target ROAS — mature", 2.20, fmt=PCT0,
            note="The economics bar. Fixed unless the business changes required profitability.")
R_MATURE_BE = 21
label_input(ws_in, R_MATURE_BE, "Mature Breakeven ROAS", 2.001, fmt="0.0%",
            note="Source: case study lag table, 'Mature' row.")
R_FLOOR = 22
label_input(ws_in, R_FLOOR, "Minimum Allowable Target ROAS (floor)", 2.05, fmt=PCT0,
            note="Never loosen below breakeven + a small cushion.")
R_CEILING = 23
label_input(ws_in, R_CEILING, "Maximum Allowable Target ROAS (ceiling)", 2.60, fmt=PCT0,
            note="Sanity ceiling on repeated tightening.")
R_STEP = 24
label_input(ws_in, R_STEP, "Target ROAS Step Size per intervention (points)", 0.10, fmt=PCT0)
R_BUDGET_STEP = 25
label_input(ws_in, R_BUDGET_STEP, "Budget Step Size per intervention (%)", 0.25, fmt=PCT0)
R_MIN_ORDERS = 26
label_input(ws_in, R_MIN_ORDERS, "Minimum Matured Orders for Confidence", 30,
            note="Below this, extend the window instead of acting.")
R_MIN_ORDERS_FAST = 27
label_input(ws_in, R_MIN_ORDERS_FAST, "Minimum Orders for Fast-Window Safety Check", 5,
            note="Below this, the 3-day window can't even be trusted for a safety pause.")
R_FAST_MULT = 28
label_input(ws_in, R_FAST_MULT, "Fast-Window Severe Multiple (x Breakeven)", 0.90, fmt="0%",
            note="Fast window triggers a safety pause below this fraction of breakeven.")
R_WAIT_DAYS = 29
label_input(ws_in, R_WAIT_DAYS, "Wait Period — Days", 7)
R_WAIT_ORDERS = 30
label_input(ws_in, R_WAIT_ORDERS, "Wait Period — Orders", 30)
R_PAUSE_MIN_DAYS = 31
label_input(ws_in, R_PAUSE_MIN_DAYS, "Pause Minimum Days Before Re-enable", 3)
R_BUDGET_UTIL_THRESH = 32
label_input(ws_in, R_BUDGET_UTIL_THRESH, "Budget Utilization Threshold (cap signal)", 0.95, fmt="0%",
            note="A day counts as 'budget-capped' if spend >= this fraction of budget.")
R_BUDGET_UTIL_DAYS = 33
label_input(ws_in, R_BUDGET_UTIL_DAYS, "Days at Cap Needed (of last 7) to call it Budget-Capped", 3)
R_BAND_LOWER_OFFSET = 34
label_input(ws_in, R_BAND_LOWER_OFFSET, "Normal Band — points below Required Target", 0.10, fmt=PCT0)
R_BAND_UPPER_OFFSET = 35
label_input(ws_in, R_BAND_UPPER_OFFSET, "Normal Band — points above Required Target", 0.15, fmt=PCT0,
            note="Wider on the upside: the objective is to maximize sustainable spend, "
                 "so we tolerate more upside before calling it an 'opportunity'.")
R_PRIMARY_LEN = 36
label_input(ws_in, R_PRIMARY_LEN, "Primary Window Length (days)", 14)
R_FALLBACK_LEN = 37
label_input(ws_in, R_FALLBACK_LEN, "Fallback Window Length (days)", 30)
R_FAST_LEN = 38
label_input(ws_in, R_FAST_LEN, "Fast Window Length (days)", 3)

def IN(row):
    return f"Inputs!$B${row}"

# =========================================================================
# SHEET: Lag Table
# =========================================================================
ws_lag = wb.create_sheet("Lag Table")
ws_lag.sheet_view.showGridLines = False
for col, w in zip("ABCDE", [10, 14, 20, 24, 55]):
    ws_lag.column_dimensions[col].width = w
title_row(ws_lag, 1, "Lag Table — Conversion Maturity Curve", span=5)

headers = ["Age Key", "Age Label", "% Revenue Observed", "Breakeven ROAS (Mature-Adjusted)", "Notes"]
HR = 2
for i, h in enumerate(headers, start=1):
    c = ws_lag.cell(row=HR, column=i, value=h)
    c.font = HEADER_FONT
    c.fill = HEADER_FILL
    c.alignment = Alignment(wrap_text=True, vertical="center")

lag_rows = [
    (0, "D0", 0.492),
    (1, "D1", 0.577),
    (2, "D2", 0.614),
    (3, "D3", 0.641),
    (4, "D4", 0.663),
    (5, "D5", 0.679),
    (6, "D6", 0.693),
    (7, "D7", 0.710),
    (8, "8+ (Mature)", 1.00),
]
LAG_FIRST = HR + 1
LAG_LAST = LAG_FIRST + len(lag_rows) - 1
for i, (key, label, pct) in enumerate(lag_rows):
    row = LAG_FIRST + i
    ws_lag.cell(row=row, column=1, value=key).font = FORMULA_FONT
    ws_lag.cell(row=row, column=2, value=label).font = FORMULA_FONT
    c = ws_lag.cell(row=row, column=3, value=pct)
    c.font = INPUT_FONT
    c.fill = INPUT_FILL
    c.number_format = PCT1
    fc = ws_lag.cell(row=row, column=4, value=f"=C{row}*{IN(R_MATURE_BE)}")
    fc.font = FORMULA_FONT
    fc.number_format = "0.0%"
    for col in (1, 2, 3, 4):
        ws_lag.cell(row=row, column=col).border = BORDER
note = ws_lag.cell(row=LAG_FIRST, column=5,
                    value="Source: case study lag table. % Revenue Observed is the share of a spend "
                          "day's eventual (mature) revenue that has posted by that age.")
note.font = NOTE_FONT
note2 = ws_lag.cell(row=LAG_FIRST + 1, column=5,
                     value="Breakeven ROAS = % Observed x Mature Breakeven ROAS (Inputs!B21). "
                           "This is the reported ROAS a break-even day would show at that age.")
note2.font = NOTE_FONT
LAG_AGE_RANGE = f"'Lag Table'!$A${LAG_FIRST}:$A${LAG_LAST}"
LAG_PCT_RANGE = f"'Lag Table'!$C${LAG_FIRST}:$C${LAG_LAST}"

# =========================================================================
# SHEET: Daily Data
# =========================================================================
ws_dd = wb.create_sheet("Daily Data")
ws_dd.sheet_view.showGridLines = False
for col, w in zip("ABCDEFGHI", [12, 12, 16, 10, 9, 14, 18, 16, 16]):
    ws_dd.column_dimensions[col].width = w
title_row(ws_dd, 1, "Daily Data — paste today's export as a new row at the bottom (oldest -> newest)", span=8)

dd_headers = ["Date", "Spend ($)", "Revenue To Date ($)", "Orders", "Age (Days)",
              "% Revenue\nObserved", "Projected Mature\nRevenue ($)", "Reported ROAS\n(raw, day)",
              "Age-Adjusted ROAS\n(day)"]
DDHR = 2
for i, h in enumerate(dd_headers, start=1):
    c = ws_dd.cell(row=DDHR, column=i, value=h)
    c.font = HEADER_FONT
    c.fill = HEADER_FILL
    c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
ws_dd.row_dimensions[DDHR].height = 30

DD_FIRST = DDHR + 1
DD_LAST = DD_FIRST + 99  # 100-row capacity buffer

# --- Synthetic sample data: 21 days ending 2026-08-08, illustrating a genuine dip in the
# final ~5 days that the lag-adjustment must correctly interpret. ---
random.seed(42)
AAOV = 85.0
start_date = datetime.date(2026, 8, 8) - datetime.timedelta(days=20)
sample_rows = []
for i in range(21):
    d = start_date + datetime.timedelta(days=i)
    days_from_end = 20 - i  # 0 = most recent (2026-08-08)
    if days_from_end <= 4:
        true_roas = random.uniform(1.90, 2.05)   # genuine recent dip
    else:
        true_roas = random.uniform(2.15, 2.35)   # normal healthy history
    spend = round(random.uniform(4700, 5300), 0)
    age = days_from_end
    pct_obs = 1.00 if age >= 8 else lag_rows[age][2]
    noise = random.uniform(0.97, 1.03)
    revenue_to_date = round(spend * true_roas * pct_obs * noise, 2)
    orders = max(1, round(revenue_to_date / AAOV))
    sample_rows.append((d, spend, revenue_to_date, orders))

for i in range(100):
    row = DD_FIRST + i
    if i < len(sample_rows):
        d, spend, revenue, orders = sample_rows[i]
        for col, val, fmt in ((1, d, "yyyy-mm-dd"), (2, spend, USD0), (3, revenue, USD0), (4, orders, "#,##0")):
            c = ws_dd.cell(row=row, column=col, value=val)
            c.font = INPUT_FONT
            c.fill = INPUT_FILL
            c.number_format = fmt
            c.border = BORDER
    else:
        for col, fmt in ((1, "yyyy-mm-dd"), (2, USD0), (3, USD0), (4, "#,##0")):
            c = ws_dd.cell(row=row, column=col)
            c.font = INPUT_FONT
            c.fill = INPUT_FILL
            c.number_format = fmt
            c.border = BORDER

    age_c = ws_dd.cell(row=row, column=5, value=f"=IF($A{row}=\"\",\"\",{IN(R_TODAY)}-$A{row})")
    age_c.font = FORMULA_FONT
    age_c.border = BORDER

    pct_c = ws_dd.cell(row=row, column=6,
                        value=f"=IF($A{row}=\"\",\"\",INDEX({LAG_PCT_RANGE},MATCH(MIN($E{row},8),{LAG_AGE_RANGE},0)))")
    pct_c.font = FORMULA_FONT
    pct_c.number_format = PCT1
    pct_c.border = BORDER

    proj_c = ws_dd.cell(row=row, column=7, value=f"=IF($A{row}=\"\",\"\",$C{row}/$F{row})")
    proj_c.font = FORMULA_FONT
    proj_c.number_format = USD0
    proj_c.border = BORDER

    raw_roas_c = ws_dd.cell(row=row, column=8, value=f"=IF($A{row}=\"\",\"\",IFERROR($C{row}/$B{row},\"\"))")
    raw_roas_c.font = FORMULA_FONT
    raw_roas_c.number_format = PCT0
    raw_roas_c.border = BORDER

    adj_roas_c = ws_dd.cell(row=row, column=9, value=f"=IF($A{row}=\"\",\"\",IFERROR($G{row}/$B{row},\"\"))")
    adj_roas_c.font = FORMULA_FONT
    adj_roas_c.number_format = PCT0
    adj_roas_c.border = BORDER

DD_DATE = f"'Daily Data'!$A${DD_FIRST}:$A${DD_LAST}"
DD_SPEND = f"'Daily Data'!$B${DD_FIRST}:$B${DD_LAST}"
DD_REVENUE = f"'Daily Data'!$C${DD_FIRST}:$C${DD_LAST}"
DD_ORDERS = f"'Daily Data'!$D${DD_FIRST}:$D${DD_LAST}"
DD_AGE = f"'Daily Data'!$E${DD_FIRST}:$E${DD_LAST}"
DD_PROJREV = f"'Daily Data'!$G${DD_FIRST}:$G${DD_LAST}"
DD_DATE_COL = f"'Daily Data'!$A${DD_FIRST}:$A${DD_LAST}"

note = ws_dd.cell(row=1, column=9, value="")  # placeholder, real note added below on a spare row
ws_dd.cell(row=DD_LAST + 2, column=1,
           value="Note: formulas are pre-filled for 100 rows (~3 months of daily capacity). If you "
                 "exceed row " + str(DD_LAST) + ", copy the formulas in columns E:I down further.").font = NOTE_FONT

# =========================================================================
# SHEET: Trend (Weekly) — older history, chart context only
# =========================================================================
ws_tr = wb.create_sheet("Trend (Weekly)")
ws_tr.sheet_view.showGridLines = False
for col, w in zip("ABCD", [16, 14, 16, 14]):
    ws_tr.column_dimensions[col].width = w
title_row(ws_tr, 1, "Trend (Weekly) — older history for chart context only (fully matured; not used in decision formulas)", span=4)
tr_headers = ["Week Starting", "Spend ($)", "Revenue ($)", "ROAS"]
TRHR = 2
for i, h in enumerate(tr_headers, start=1):
    c = ws_tr.cell(row=TRHR, column=i, value=h)
    c.font = HEADER_FONT
    c.fill = HEADER_FILL
TR_FIRST = TRHR + 1
week_start = start_date - datetime.timedelta(days=7 * 6)
for i in range(6):
    row = TR_FIRST + i
    wk = week_start + datetime.timedelta(days=7 * i)
    spend = round(random.uniform(33000, 37000), 0)
    roas = random.uniform(2.18, 2.30)
    revenue = round(spend * roas, 0)
    for col, val, fmt in ((1, wk, "yyyy-mm-dd"), (2, spend, USD0), (3, revenue, USD0)):
        c = ws_tr.cell(row=row, column=col, value=val)
        c.font = INPUT_FONT
        c.fill = INPUT_FILL
        c.number_format = fmt
        c.border = BORDER
    rc = ws_tr.cell(row=row, column=4, value=f"=C{row}/B{row}")
    rc.font = FORMULA_FONT
    rc.number_format = PCT0
    rc.border = BORDER

# =========================================================================
# SHEET: Engine
# =========================================================================
ws_e = wb.create_sheet("Engine")
ws_e.sheet_view.showGridLines = False
ws_e.column_dimensions["A"].width = 44
ws_e.column_dimensions["B"].width = 16
ws_e.column_dimensions["C"].width = 60
title_row(ws_e, 1, "Engine — window math and gating logic (formulas only; audit here, edit nothing)", span=3)

row = 3
section_row(ws_e, row, "Window Aggregates"); row += 1

def sumifs_age_le(col_range, age_max_formula):
    return f"=SUMIFS({col_range},{DD_AGE},\"<=\"&{age_max_formula})"

# Fast window (age <= FastLen-1)
FAST_MAX_AGE = f"({IN(R_FAST_LEN)}-1)"
R_FAST_SPEND = row; label_formula(ws_e, row, "Fast Window Spend (sum)", sumifs_age_le(DD_SPEND, FAST_MAX_AGE), USD0); row += 1
R_FAST_PROJREV = row; label_formula(ws_e, row, "Fast Window Projected Revenue (sum)", sumifs_age_le(DD_PROJREV, FAST_MAX_AGE), USD0); row += 1
R_FAST_ORDERS = row; label_formula(ws_e, row, "Fast Window Orders (sum)", sumifs_age_le(DD_ORDERS, FAST_MAX_AGE), "#,##0"); row += 1
R_FAST_ADJROAS = row
label_formula(ws_e, row, "Fast Window Adjusted ROAS", f"=IFERROR(B{R_FAST_PROJREV}/B{R_FAST_SPEND},0)", PCT0,
              note=f"Sum(Projected Mature Revenue) / Sum(Spend), age <= {IN(R_FAST_LEN)}-1"); row += 1
row += 1

PRIMARY_MAX_AGE = f"({IN(R_PRIMARY_LEN)}-1)"
R_PRI_SPEND = row; label_formula(ws_e, row, "Primary Window Spend (sum)", sumifs_age_le(DD_SPEND, PRIMARY_MAX_AGE), USD0); row += 1
R_PRI_PROJREV = row; label_formula(ws_e, row, "Primary Window Projected Revenue (sum)", sumifs_age_le(DD_PROJREV, PRIMARY_MAX_AGE), USD0); row += 1
R_PRI_ORDERS = row; label_formula(ws_e, row, "Primary Window Orders (sum)", sumifs_age_le(DD_ORDERS, PRIMARY_MAX_AGE), "#,##0"); row += 1
R_PRI_ADJROAS = row
label_formula(ws_e, row, "Primary Window Adjusted ROAS", f"=IFERROR(B{R_PRI_PROJREV}/B{R_PRI_SPEND},0)", PCT0); row += 1
row += 1

FALLBACK_MAX_AGE = f"({IN(R_FALLBACK_LEN)}-1)"
R_FB_SPEND = row; label_formula(ws_e, row, "Fallback Window Spend (sum)", sumifs_age_le(DD_SPEND, FALLBACK_MAX_AGE), USD0); row += 1
R_FB_PROJREV = row; label_formula(ws_e, row, "Fallback Window Projected Revenue (sum)", sumifs_age_le(DD_PROJREV, FALLBACK_MAX_AGE), USD0); row += 1
R_FB_ORDERS = row; label_formula(ws_e, row, "Fallback Window Orders (sum)", sumifs_age_le(DD_ORDERS, FALLBACK_MAX_AGE), "#,##0"); row += 1
R_FB_ADJROAS = row
label_formula(ws_e, row, "Fallback Window Adjusted ROAS", f"=IFERROR(B{R_FB_PROJREV}/B{R_FB_SPEND},0)", PCT0); row += 1
row += 1

R_WINDOW_USED = row
label_formula(ws_e, row, "Window Used",
              f'=IF(B{R_PRI_ORDERS}>={IN(R_MIN_ORDERS)},"Primary (14d)",'
              f'IF(B{R_FB_ORDERS}>={IN(R_MIN_ORDERS)},"Fallback (30d)","Insufficient"))',
              note="Primary window used unless it lacks confidence, then fallback, else flagged insufficient."); row += 1
R_ADJROAS_USED = row
label_formula(ws_e, row, "Adjusted ROAS Used",
              f'=IF(B{R_WINDOW_USED}="Primary (14d)",B{R_PRI_ADJROAS},'
              f'IF(B{R_WINDOW_USED}="Fallback (30d)",B{R_FB_ADJROAS},0))', PCT0); row += 1
R_ORDERS_USED = row
label_formula(ws_e, row, "Orders Used",
              f'=IF(B{R_WINDOW_USED}="Primary (14d)",B{R_PRI_ORDERS},'
              f'IF(B{R_WINDOW_USED}="Fallback (30d)",B{R_FB_ORDERS},B{R_PRI_ORDERS}))', "#,##0"); row += 1
row += 1

section_row(ws_e, row, "Gating: Wait Period / Pause / Safety"); row += 1
R_DAYS_SINCE = row
label_formula(ws_e, row, "Days Since Last Change", f"={IN(R_TODAY)}-{IN(R_LAST_CHANGE_DATE)}", "#,##0"); row += 1
R_ORDERS_SINCE = row
label_formula(ws_e, row, "Orders Since Last Change",
              f'=SUMIFS({DD_ORDERS},{DD_DATE_COL},">"&{IN(R_LAST_CHANGE_DATE)})', "#,##0"); row += 1
R_WAITOK = row
label_formula(ws_e, row, "Wait Period Satisfied? (for ROAS/Budget changes)",
              f'=OR(NOT(OR({IN(R_LAST_CHANGE_TYPE)}="Target ROAS Change",'
              f'{IN(R_LAST_CHANGE_TYPE)}="Budget Change")),'
              f'AND(B{R_DAYS_SINCE}>={IN(R_WAIT_DAYS)},B{R_ORDERS_SINCE}>={IN(R_WAIT_ORDERS)}))',
              note="TRUE automatically if the last change wasn't a Target ROAS/Budget change."); row += 1
R_PAUSED = row
label_formula(ws_e, row, "Campaign Paused?", f'=({IN(R_STATUS)}="Paused")'); row += 1
R_DAYS_PAUSED = row
label_formula(ws_e, row, "Days Paused",
              f"=IF(B{R_PAUSED},{IN(R_TODAY)}-{IN(R_LAST_CHANGE_DATE)},0)", "#,##0"); row += 1
R_PAUSE_WAIT_OK = row
label_formula(ws_e, row, "Pause Minimum Elapsed?", f"=(B{R_DAYS_PAUSED}>={IN(R_PAUSE_MIN_DAYS)})"); row += 1
R_SAFETY = row
label_formula(ws_e, row, "Fast Window Severe? (safety trigger)",
              f'=AND(B{R_FAST_ADJROAS}<({IN(R_MATURE_BE)}*{IN(R_FAST_MULT)}),'
              f'B{R_FAST_ORDERS}>={IN(R_MIN_ORDERS_FAST)})'); row += 1
R_SAFETY_TRIGGER = row
label_formula(ws_e, row, "Safety Pause Trigger", f"=AND(NOT(B{R_PAUSED}),B{R_SAFETY})"); row += 1
row += 1

section_row(ws_e, row, "Seasonality"); row += 1
R_SEASON_END_DATE = row
label_formula(ws_e, row, "Season End Date (computed)",
              f"={IN(R_SEASON_START)}+{IN(R_SEASON_DUR)}-1", "yyyy-mm-dd"); row += 1
R_SEASON_ACTIVE_CALC = row
label_formula(ws_e, row, "Seasonality Active Today?",
              f'=AND({IN(R_SEASON_ACTIVE)}="Y",{IN(R_TODAY)}>={IN(R_SEASON_START)},'
              f'{IN(R_TODAY)}<=B{R_SEASON_END_DATE})'); row += 1
R_SEASON_START_TODAY = row
label_formula(ws_e, row, "Season Starts Today?", f"=({IN(R_TODAY)}={IN(R_SEASON_START)})"); row += 1
R_SEASON_END_TODAY = row
label_formula(ws_e, row, "Season Ends Today?", f"=({IN(R_TODAY)}=B{R_SEASON_END_DATE})"); row += 1
row += 1

section_row(ws_e, row, "Budget Cap Check  (fixed 7-day lookback, age <= 6)"); row += 1
R_DAYS_AT_CAP = row
label_formula(ws_e, row, "Days at Budget Cap (last 7)",
              f'=SUMPRODUCT(({DD_AGE}<>"")*({DD_AGE}<=6)*({DD_SPEND}>={IN(R_CUR_BUDGET)}*{IN(R_BUDGET_UTIL_THRESH)}))',
              "#,##0"); row += 1
R_BUDGET_CAPPED = row
label_formula(ws_e, row, "Budget Capped?", f"=(B{R_DAYS_AT_CAP}>={IN(R_BUDGET_UTIL_DAYS)})"); row += 1
row += 1

section_row(ws_e, row, "Decision Bands (evaluated only when data is sufficient)"); row += 1
R_NORM_LOWER = row
label_formula(ws_e, row, "Normal Band Lower", f"={IN(R_REQ_TARGET)}-{IN(R_BAND_LOWER_OFFSET)}", PCT0); row += 1
R_NORM_UPPER = row
label_formula(ws_e, row, "Normal Band Upper", f"={IN(R_REQ_TARGET)}+{IN(R_BAND_UPPER_OFFSET)}", PCT0); row += 1
row += 1

section_row(ws_e, row, "Master Decision Case (single source of truth for the Decision tab)"); row += 1
R_CASE = row
case_formula = (
    "=_xlfn.IFS("
    f"B{R_SAFETY_TRIGGER},\"SAFETY_PAUSE\","
    f"B{R_PAUSED},IF(B{R_PAUSE_WAIT_OK},\"PAUSED_REENABLE\",\"PAUSED_HOLD\"),"
    f"AND(B{R_SEASON_ACTIVE_CALC},B{R_SEASON_START_TODAY}),\"SEASON_START\","
    f"AND(B{R_SEASON_ACTIVE_CALC},B{R_SEASON_END_TODAY}),\"SEASON_END\","
    f"AND(B{R_SEASON_ACTIVE_CALC},NOT(B{R_SEASON_START_TODAY}),NOT(B{R_SEASON_END_TODAY})),\"SEASON_MID\","
    f"NOT(B{R_WAITOK}),\"WAIT_HOLD\","
    f"B{R_WINDOW_USED}=\"Insufficient\",\"DATA_INSUFFICIENT\","
    f"B{R_ADJROAS_USED}<{IN(R_MATURE_BE)},\"SEVERE_PAUSE\","
    f"B{R_ADJROAS_USED}<B{R_NORM_LOWER},\"TIGHTEN\","
    f"B{R_ADJROAS_USED}<=B{R_NORM_UPPER},\"NORMAL\","
    f"AND(B{R_ADJROAS_USED}>B{R_NORM_UPPER},B{R_BUDGET_CAPPED}),\"BUDGET_INCREASE\","
    "TRUE,\"LOOSEN\")"
)
label_formula(ws_e, row, "Decision Case", case_formula,
              note="Evaluated top-to-bottom, first TRUE wins. All Decision-tab outputs key off this one cell."); row += 1

def EN(row):
    return f"Engine!$B${row}"

# =========================================================================
# SHEET: Decision
# =========================================================================
ws_d = wb.create_sheet("Decision")
ws_d.sheet_view.showGridLines = False
ws_d.column_dimensions["A"].width = 34
ws_d.column_dimensions["B"].width = 46
for col in "CDEFGHIJ":
    ws_d.column_dimensions[col].width = 11
title_row(ws_d, 1, "Decision — run this every review", span=2)

section_row(ws_d, 3, "Diagnostics", span=2)
diag_rows = [
    ("Today's Date", f"={IN(R_TODAY)}", "yyyy-mm-dd"),
    ("Campaign Status", f"={IN(R_STATUS)}", None),
    ("Window Used", f"={EN(R_WINDOW_USED)}", None),
    ("Adjusted ROAS (window used)", f"={EN(R_ADJROAS_USED)}", PCT0),
    ("Fast Window (3-day) Adjusted ROAS", f"={EN(R_FAST_ADJROAS)}", PCT0),
    ("Orders in Window Used", f"={EN(R_ORDERS_USED)}", "#,##0"),
    ("Required Target ROAS / Breakeven", f'=TEXT({IN(R_REQ_TARGET)},"0%")&" / "&TEXT({IN(R_MATURE_BE)},"0.0%")', None),
    ("Normal Band", f'=TEXT({EN(R_NORM_LOWER)},"0%")&" - "&TEXT({EN(R_NORM_UPPER)},"0%")', None),
    ("Safety Check Triggered?", f"={EN(R_SAFETY_TRIGGER)}", None),
    ("Seasonality Active Today?", f"={EN(R_SEASON_ACTIVE_CALC)}", None),
    ("Wait Period Satisfied?", f"={EN(R_WAITOK)}", None),
    ("Budget Near Cap (last 7d)?", f"={EN(R_BUDGET_CAPPED)}", None),
]
row = 4
diag_first = row
for label, formula, fmt in diag_rows:
    label_formula(ws_d, row, label, formula, fmt)
    row += 1
diag_last = row - 1

row += 1
section_row(ws_d, row, "Required System Output", span=2); row += 1

case_ref = EN(R_CASE)

def out_formula(mapping, default=None):
    parts = []
    for case, val in mapping.items():
        parts.append(f'{case_ref}="{case}",{val}')
    inner = ",".join(parts)
    tail = f',TRUE,{default}' if default is not None else ""
    return f"=_xlfn.IFS({inner}{tail})"

# ---- ACTION ----
action_map = {
    "SAFETY_PAUSE": '"Pause the campaign"',
    "PAUSED_HOLD": '"No action — remain paused"',
    "PAUSED_REENABLE": '"Re-enable the campaign"',
    "SEASON_START": '"Apply seasonality adjustment"',
    "SEASON_MID": '"No action — seasonality adjustment in effect"',
    "SEASON_END": '"Revert seasonality adjustment"',
    "WAIT_HOLD": '"No action — wait"',
    "DATA_INSUFFICIENT": '"No action — insufficient data"',
    "SEVERE_PAUSE": '"Pause the campaign"',
    "TIGHTEN": '"Increase Target ROAS"',
    "NORMAL": '"No action"',
    "BUDGET_INCREASE": '"Increase Budget"',
    "LOOSEN": '"Decrease Target ROAS"',
}
R_ACTION = row
c = ws_d.cell(row=row, column=1, value="ACTION")
c.font = SECTION_FONT
oc = ws_d.cell(row=row, column=2, value=out_formula(action_map))
oc.font = BIG_OUT_FONT
oc.fill = OUT_FILL
oc.border = BORDER
oc.alignment = Alignment(wrap_text=True, vertical="center")
ws_d.row_dimensions[row].height = 20
row += 1

# ---- VALUE ----
new_tighten = f'MIN({IN(R_CUR_TARGET)}+{IN(R_STEP)},{IN(R_CEILING)})'
new_loosen = f'MAX({IN(R_CUR_TARGET)}-{IN(R_STEP)},{IN(R_FLOOR)})'
new_budget = f'{IN(R_CUR_BUDGET)}*(1+{IN(R_BUDGET_STEP)})'
reenable_target = f'{IN(R_CUR_TARGET)}+{IN(R_STEP)}'
reenable_budget = f'{IN(R_CUR_BUDGET)}*0.5'
season_start_target = f'IF({IN(R_SEASON_DIR)}="Up",{IN(R_CUR_TARGET)}-{IN(R_SEASON_SIZE)},{IN(R_CUR_TARGET)}+{IN(R_SEASON_SIZE)})'

value_map = {
    "SAFETY_PAUSE": '"Campaign status -> Paused"',
    "PAUSED_HOLD": '"No change (remain paused)"',
    "PAUSED_REENABLE": f'"Target ROAS -> "&TEXT({reenable_target},"0%")&", Budget -> $"&TEXT({reenable_budget},"#,##0")&"/day (ramp-up)"',
    "SEASON_START": f'"Target ROAS -> "&TEXT({season_start_target},"0%")&" for "&{IN(R_SEASON_DUR)}&" days"',
    "SEASON_MID": '"No change"',
    "SEASON_END": f'"Target ROAS -> "&TEXT({IN(R_SEASON_BASELINE)},"0%")&" (reverting to baseline)"',
    "WAIT_HOLD": '"No change"',
    "DATA_INSUFFICIENT": '"No change"',
    "SEVERE_PAUSE": '"Campaign status -> Paused"',
    "TIGHTEN": f'"Target ROAS -> "&TEXT({new_tighten},"0%")',
    "NORMAL": '"No change"',
    "BUDGET_INCREASE": f'"Budget -> $"&TEXT({new_budget},"#,##0")&"/day"',
    "LOOSEN": f'"Target ROAS -> "&TEXT({new_loosen},"0%")',
}
R_VALUE = row
c = ws_d.cell(row=row, column=1, value="VALUE")
c.font = SECTION_FONT
oc = ws_d.cell(row=row, column=2, value=out_formula(value_map))
oc.font = BIG_OUT_FONT
oc.fill = OUT_FILL
oc.border = BORDER
oc.alignment = Alignment(wrap_text=True, vertical="center")
row += 1

# ---- REASON ----
reason_map = {
    "SAFETY_PAUSE": '"Last 3 days are tracking well below breakeven even after adjusting for conversion lag. Pausing now to stop losses while the issue is investigated."',
    "PAUSED_HOLD": '"Campaign is paused and the minimum pause period has not yet elapsed."',
    "PAUSED_REENABLE": '"Minimum pause period has elapsed. Restarting conservatively to confirm the issue is resolved."',
    "SEASON_START": '"A known seasonality event is starting. Adjusting the target ahead of time rather than reacting to the expected swing."',
    "SEASON_MID": '"Seasonality adjustment is active. Current swings are expected and are not a signal to act on."',
    "SEASON_END": '"Seasonality event has ended. Reverting to the standard target."',
    "WAIT_HOLD": '"A change was made recently. The algorithm needs more time and order volume to relearn before it can be judged."',
    "DATA_INSUFFICIENT": '"Not enough matured orders yet to reliably tell signal from normal noise."',
    "SEVERE_PAUSE": '"Even the more reliable matured window is below breakeven. This is a confirmed, sustained problem, not noise."',
    "TIGHTEN": '"Matured, lag-adjusted ROAS is running below the normal range around target. Tightening to protect margin."',
    "NORMAL": '"Matured, lag-adjusted ROAS is within the normal range around target. This is ordinary volatility."',
    "BUDGET_INCREASE": '"Efficiency is comfortably above target and spend is capped by budget. Raising the ceiling to capture more profitable volume."',
    "LOOSEN": '"Efficiency is comfortably above target with budget headroom. Loosening the target to responsibly spend more toward the goal of maximizing volume."',
}
R_REASON = row
c = ws_d.cell(row=row, column=1, value="REASON")
c.font = SECTION_FONT
oc = ws_d.cell(row=row, column=2, value=out_formula(reason_map))
oc.font = Font(name=FONT_NAME, size=10, color="000000")
oc.fill = OUT_FILL
oc.border = BORDER
oc.alignment = Alignment(wrap_text=True, vertical="center")
ws_d.row_dimensions[row].height = 45
row += 1

# ---- REVIEW CADENCE ----
wait_days_left = f'MAX(0,{IN(R_WAIT_DAYS)}-{EN(R_DAYS_SINCE)})'
wait_orders_left = f'MAX(0,{IN(R_WAIT_ORDERS)}-{EN(R_ORDERS_SINCE)})'
insuff_needed = f'MAX(0,{IN(R_MIN_ORDERS)}-{EN(R_ORDERS_USED)})'
cadence_map = {
    "SAFETY_PAUSE": '"Tomorrow (daily while paused)"',
    "PAUSED_HOLD": '"Tomorrow"',
    "PAUSED_REENABLE": '"Tomorrow (daily during ramp-up)"',
    "SEASON_START": '"Tomorrow (safety check only during season)"',
    "SEASON_MID": '"Tomorrow (safety check only)"',
    "SEASON_END": '"In 7 days or after 30 new orders, whichever is later"',
    "WAIT_HOLD": f'"In "&{wait_days_left}&" more day(s), or after "&{wait_orders_left}&" more order(s) — whichever is later"',
    "DATA_INSUFFICIENT": f'"After "&{insuff_needed}&" more matured order(s) accumulate"',
    "SEVERE_PAUSE": '"Tomorrow (daily while paused)"',
    "TIGHTEN": '"In 7 days or after 30 new orders, whichever is later"',
    "NORMAL": '"Tomorrow"',
    "BUDGET_INCREASE": '"In 7 days or after 30 new orders, whichever is later"',
    "LOOSEN": '"In 7 days or after 30 new orders, whichever is later"',
}
R_CADENCE = row
c = ws_d.cell(row=row, column=1, value="REVIEW CADENCE")
c.font = SECTION_FONT
oc = ws_d.cell(row=row, column=2, value=out_formula(cadence_map))
oc.font = Font(name=FONT_NAME, size=11, bold=True, color="1F4E78")
oc.fill = OUT_FILL
oc.border = BORDER
oc.alignment = Alignment(wrap_text=True, vertical="center")
row += 1

# ---- WAIT PERIOD ----
wait_map = {
    "SAFETY_PAUSE": '"Minimum 3 days paused before re-enable is eligible"',
    "PAUSED_HOLD": '"N/A — no new change made"',
    "PAUSED_REENABLE": '"7 days matured AND 30 new orders before the next Target ROAS/Budget change"',
    "SEASON_START": '"No manual wait — reverts automatically at the scheduled end date"',
    "SEASON_MID": '"N/A — no new change made"',
    "SEASON_END": '"7 days matured AND 30 new orders before the next Target ROAS/Budget change"',
    "WAIT_HOLD": '"N/A — already inside the wait period from the prior change"',
    "DATA_INSUFFICIENT": '"N/A — no new change made"',
    "SEVERE_PAUSE": '"Minimum 3 days paused before re-enable is eligible"',
    "TIGHTEN": '"7 days matured AND 30 new orders before the next change"',
    "NORMAL": '"N/A — no new change made"',
    "BUDGET_INCREASE": '"7 days matured AND 30 new orders before the next change"',
    "LOOSEN": '"7 days matured AND 30 new orders before the next change"',
}
R_WAIT = row
c = ws_d.cell(row=row, column=1, value="WAIT PERIOD")
c.font = SECTION_FONT
oc = ws_d.cell(row=row, column=2, value=out_formula(wait_map))
oc.font = Font(name=FONT_NAME, size=10, color="000000")
oc.fill = OUT_FILL
oc.border = BORDER
oc.alignment = Alignment(wrap_text=True, vertical="center")
row += 2

# ---- Chart ----
section_row(ws_d, row, "Chart — look here first", span=2)
chart_anchor_row = row + 1

chart = LineChart()
chart.title = "Reported vs. Age-Adjusted ROAS (Daily Data)"
chart.style = 2
chart.y_axis.title = "ROAS"
chart.x_axis.title = "Date"
chart.y_axis.numFmt = "0%"
chart.height = 9
chart.width = 22

n_sample = len(sample_rows)
cats = Reference(ws_dd, min_col=1, min_row=DD_FIRST, max_row=DD_FIRST + n_sample - 1)
data_raw = Reference(ws_dd, min_col=8, min_row=DDHR, max_row=DD_FIRST + n_sample - 1)
data_adj = Reference(ws_dd, min_col=9, min_row=DDHR, max_row=DD_FIRST + n_sample - 1)
chart.add_data(data_raw, titles_from_data=True)
chart.add_data(data_adj, titles_from_data=True)
chart.set_categories(cats)
chart.series[0].graphicalProperties.line.width = 15000
chart.series[0].graphicalProperties.line.solidFill = "BFBFBF"
chart.series[0].smooth = False
chart.series[1].graphicalProperties.line.width = 25000
chart.series[1].graphicalProperties.line.solidFill = "1F4E78"
chart.series[1].smooth = False

ws_d.add_chart(chart, f"A{chart_anchor_row}")

wb.save("/tmp/claude-0/-home-user-paid-search-use-case/57d43694-ee27-5375-888e-e385fc115d10/scratchpad/workbook_stage4.xlsx")
print("stage4 saved (+ Decision + chart).")
print("Rows:", dict(R_ACTION=R_ACTION, R_VALUE=R_VALUE, R_REASON=R_REASON, R_CADENCE=R_CADENCE, R_WAIT=R_WAIT))
