# Campaign Control System — Phase 2 Case Study

An operating system for running a large-scale paid-search campaign (Target ROAS
bidding, 220% mature target, 7-day click attribution) without daily judgment
calls. Built so a team member can look at a chart, enter today's data, and get
a consistent recommendation — even if the person who built it is unavailable
for a week.

## Deliverables

| File | What it is |
|---|---|
| **`Campaign_Control_System.xlsx`** | The working system (Option 1 — Google Sheet / formula). Paste in daily data, get `ACTION` / `VALUE` / `REASON` / `REVIEW CADENCE` / `WAIT PERIOD` back. Every cell is a live formula — no hardcoded results — so you can change any input and stress-test the logic yourself. |
| **`Campaign_Control_System_Framework.docx`** | The 2-page plain-language explanation of the same logic (Option 3), for anyone who wants the "why" without opening the spreadsheet. |
| **`tools/`** | The scripts that generate both deliverables from scratch, plus the stress-test harness used to validate every decision branch before delivery (see below). Not required to use the system — kept for transparency and so the workbook can be regenerated or extended. |

## How the system works, in one paragraph

Recently-spent money hasn't finished converting yet, so the system never
judges a day by its raw reported ROAS. It grosses up each day's revenue by
how much of its eventual (mature) value has typically posted by that day's
age — using the conversion-lag curve given in the case — then compares that
**age-adjusted ROAS** to the 220% required target and the ~200% breakeven
line. It only acts on a rolling 14-day window with at least 30 matured
orders (extending to 30 days, or holding, if volume is thin), so a single
noisy day can't trigger a change. A 3-day "fast window" exists purely as a
safety net to catch a real, acute breakeven breach sooner. After any Target
ROAS or budget change, the system holds for 7 days AND 30 new orders before
it will recommend another change, so the bidding algorithm has time to
relearn. Full mechanics, thresholds, and the exact decision bands are in the
2-page framework doc; the live math is in the workbook's `Engine` tab.

## Validation

Every one of the system's 13 decision branches (safety pause, confirmed
pause, tighten, normal, loosen, budget increase, paused/hold, paused/re-enable,
wait-hold, insufficient-data, and all three seasonality states) was
exercised end-to-end with real LibreOffice recalculation — not just read as
a formula — before delivery. See `tools/stress_test.py`.

## Using the workbook

1. Open `Daily Data`. Paste today's export as a new row at the bottom
   (Date, Spend, Revenue-to-Date, Orders).
2. Open `Inputs`. Update Today's Date, Campaign Status, Current Platform
   Target ROAS, Current Daily Budget, and Last Change Date/Type if you
   changed anything yesterday.
3. Open `Decision`. Look at the chart, then read the five output fields.
4. Make the change described in `VALUE` (if any), then update `Last Change
   Date`/`Last Change Type` on `Inputs` so the wait-period logic knows.
5. Come back on the date/condition given in `REVIEW CADENCE`. Repeat.

The `Daily Data` and `Trend (Weekly)` tabs are seeded with 21 days of daily
sample data plus 6 weeks of older weekly history so the system is
demonstrable out of the box — replace it with a real export before using it
to run the actual account.

## Regenerating the workbook

```bash
pip install openpyxl        # if not already installed
python3 tools/build_workbook.py
# writes /tmp/.../workbook_stage4.xlsx — copy over Campaign_Control_System.xlsx,
# then recalculate with LibreOffice (see the xlsx skill's scripts/recalc.py)
```

```bash
npm install docx             # if not already installed
node tools/build_framework_doc.js
```
