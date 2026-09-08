const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, PageBreak, convertInchesToTwip,
  LevelFormat,
} = require("docx");

const US_LETTER = { width: 12240, height: 15840 };
const MARGIN = 620; // ~0.43in, tight to fit 2 pages

const NAVY = "1F4E78";
const LIGHTBLUE = "D9E1F2";
const GREEN = "E2EFDA";
const RED = "FBE2E2";
const GREY = "595959";

function h(text, size = 20) {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text, bold: true, color: NAVY, size, font: "Arial" })],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 17, font: "Arial", ...opts })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 20 },
    children: [new TextRun({ text, size: 17, font: "Arial" })],
  });
}

function cell(text, opts = {}) {
  const { bold = false, fill = null, width = null, color = "000000", align = AlignmentType.LEFT, size = 16 } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size, font: "Arial", color })],
    })],
  });
}

function bandTable() {
  const widths = [2600, 2000, 3200, 2400]; // sum 10200
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("Primary-Window Adjusted ROAS", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[0] }),
      cell("Zone", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[1] }),
      cell("Action", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[2] }),
      cell("Value", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[3] }),
    ],
  });
  const rows = [
    ["< 200% (at/below breakeven)", "Severe", "Pause the campaign", "Status → Paused", RED],
    ["200% – 210%", "Moderate", "Increase Target ROAS", "Target ROAS +10 pts", "FFF2CC"],
    ["210% – 235%", "Normal", "No change", "—", GREEN],
    ["> 235%, budget capped", "Opportunity", "Increase Budget", "Budget +25%", GREEN],
    ["> 235%, budget not capped", "Opportunity", "Decrease Target ROAS", "Target ROAS −10 pts (floor 205%)", GREEN],
  ];
  const trows = rows.map(([a, b, c, d, fill]) => new TableRow({
    children: [
      cell(a, { width: widths[0] }),
      cell(b, { width: widths[1] }),
      cell(c, { width: widths[2] }),
      cell(d, { width: widths[3], fill }),
    ],
  }));
  return new Table({
    width: { size: 10200, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...trows],
  });
}

function lagTable() {
  const widths = [1300, 1300, 1900, 1900, 1900, 1900]; // 10200
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("Age", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[0], align: AlignmentType.CENTER, size: 14 }),
      cell("D0", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[1], align: AlignmentType.CENTER, size: 14 }),
      cell("D1–D3", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[2], align: AlignmentType.CENTER, size: 14 }),
      cell("D4–D6", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[3], align: AlignmentType.CENTER, size: 14 }),
      cell("D7", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[4], align: AlignmentType.CENTER, size: 14 }),
      cell("Mature (8+)", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[5], align: AlignmentType.CENTER, size: 14 }),
    ],
  });
  const r1 = new TableRow({ children: [
    cell("% Revenue Observed", { width: widths[0], size: 14 }),
    cell("49.2%", { width: widths[1], align: AlignmentType.CENTER, size: 14 }),
    cell("57.7–64.1%", { width: widths[2], align: AlignmentType.CENTER, size: 14 }),
    cell("66.3–69.3%", { width: widths[3], align: AlignmentType.CENTER, size: 14 }),
    cell("71.0%", { width: widths[4], align: AlignmentType.CENTER, size: 14 }),
    cell("100%", { width: widths[5], align: AlignmentType.CENTER, size: 14 }),
  ]});
  const r2 = new TableRow({ children: [
    cell("Reported ROAS at breakeven", { width: widths[0], size: 14 }),
    cell("98.5%", { width: widths[1], align: AlignmentType.CENTER, size: 14 }),
    cell("115.5–128.3%", { width: widths[2], align: AlignmentType.CENTER, size: 14 }),
    cell("132.7–138.7%", { width: widths[3], align: AlignmentType.CENTER, size: 14 }),
    cell("142.1%", { width: widths[4], align: AlignmentType.CENTER, size: 14 }),
    cell("200.1%", { width: widths[5], align: AlignmentType.CENTER, size: 14 }),
  ]});
  return new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: widths, rows: [header, r1, r2] });
}

function outputTable() {
  const widths = [2200, 8000];
  const rows = [
    ["ACTION", "What the team does (Pause / Re-enable / Increase or Decrease Target ROAS / Increase Budget / Apply or Revert Seasonality / No change)."],
    ["VALUE", "The specific new number — e.g. “Target ROAS → 230%”, “Budget → $6,250/day”, “Status → Paused”, or “No change”."],
    ["REASON", "One plain sentence — no jargon."],
    ["REVIEW CADENCE", "When to look again: tomorrow, in N days, or after N more matured orders."],
    ["WAIT PERIOD", "Whether another change is blocked right now, and what clears it (days elapsed AND/OR orders accumulated)."],
  ];
  const header = new TableRow({ tableHeader: true, children: [
    cell("Field", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[0] }),
    cell("Meaning", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[1] }),
  ]});
  const trows = rows.map(([a, b]) => new TableRow({ children: [
    cell(a, { bold: true, width: widths[0], fill: LIGHTBLUE }),
    cell(b, { width: widths[1] }),
  ]}));
  return new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: widths, rows: [header, ...trows] });
}

function gateTable() {
  const widths = [3400, 6800];
  const rows = [
    ["Confidence gate", "Need ≥ 30 matured orders in the 14-day Primary window before acting on Target ROAS/Budget. If short, fall back to a 30-day window; if still short, hold and state how many more orders are needed."],
    ["Wait-period gate", "After any Target ROAS or Budget change: hold further Target ROAS/Budget changes until ≥ 7 days AND ≥ 30 new orders have accumulated — whichever is later. Lets the bidding algorithm relearn before it is judged again."],
    ["Pause gate", "Minimum 3 days paused before re-enable is eligible. Re-enable at Target ROAS +10 pts and 50% of the prior budget, ramping back up as the standard rules confirm recovery."],
    ["Safety gate (always on)", "A 3-day “Fast Window,” age-adjusted the same way, checks for an acute breach (< 90% of breakeven, i.e. below ~180%) with ≥ 5 matured orders. If triggered, pause immediately — this overrides every other rule, including an active wait period or seasonality window."],
  ];
  const header = new TableRow({ tableHeader: true, children: [
    cell("Gate", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[0] }),
    cell("What it does and why", { bold: true, fill: NAVY, color: "FFFFFF", width: widths[1] }),
  ]});
  const trows = rows.map(([a, b]) => new TableRow({ children: [
    cell(a, { bold: true, width: widths[0], fill: LIGHTBLUE }),
    cell(b, { width: widths[1] }),
  ]}));
  return new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: widths, rows: [header, ...trows] });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 260, hanging: 200 } } } }],
    }],
  },
  sections: [{
    properties: {
      page: { size: US_LETTER, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 20 },
        children: [new TextRun({ text: "Campaign Control System — Decision Framework", bold: true, size: 30, color: NAVY, font: "Arial" })],
      }),
      new Paragraph({
        spacing: { after: 140 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
        children: [new TextRun({ text: "Paid Search, Target ROAS bidding  |  Required (mature) Target ROAS: 220%  |  Mature Breakeven ROAS: 200.1%  |  7-day click attribution", size: 16, color: GREY, font: "Arial", italics: true })],
      }),

      h("1. Why raw reported ROAS is misleading"),
      p("Revenue keeps posting for up to 7 days after the click. A campaign's reported ROAS on the day of spend (D0) will structurally look weak even when the campaign is healthy, because only ~49% of its eventual revenue has arrived. The system never compares raw reported ROAS to target — it first grosses up each day's revenue by how much of its eventual (mature) value has typically posted by that day's age, using the case's own lag curve:"),
      lagTable(),
      p(""),
      p("Adjusted ROAS (any window) = Σ [ Revenue-to-date ÷ % Revenue Observed at that day's age ] ÷ Σ Spend", { bold: true }),
      p("Two windows are computed this way: a 3-day Fast Window (early-warning safety net only) and a 14-day Primary Window (the decision-grade signal; automatically extends to 30 days if order volume is thin — see gates below)."),

      h("2. When to act — decision bands (Primary Window Adjusted ROAS vs. the 220% target)"),
      bandTable(),
      p("The band is intentionally asymmetric: only 10 points of downside room (210%) before tightening, but 15 points of upside room (235%) before loosening — because the objective is to maximize sustainable spend, so upside is given more benefit of the doubt than downside.", { italics: true, color: GREY, size: 15 }),

      h("3. Gates — what keeps the system from overreacting to noise"),
      gateTable(),

      new Paragraph({ children: [new PageBreak()] }),

      h("4. Pause, re-enable, and seasonality"),
      p("A pause can be triggered two ways: (a) the Safety Gate above, on raw acute deterioration in the last 3 days, or (b) a confirmed breach — the slower, 14-day Primary Window itself falls below the 200.1% breakeven line, which means the problem is sustained, not a blip. Both use the identical Pause action; the difference is only which window caught it."),
      p("Seasonality is a scheduled override, not a reaction: flag a known event (e.g. Black Friday, an announced promo, a known slow week) with a direction, a duration, and an adjustment size (default ±15 points if no better historical estimate exists). On the start date the system applies the adjustment; for the interior of the window it holds (expected swings are not treated as a signal); on the end date it automatically reverts to the pre-season baseline. The Safety Gate stays active throughout — a real breakeven breach still forces a pause even mid-season."),

      h("5. Required system output (every review)"),
      outputTable(),
      p(""),
      p("Example — a review that lands in the “Moderate” band: ACTION: Increase Target ROAS.  VALUE: Target ROAS → 230%.  REASON: Matured, lag-adjusted ROAS is running below the normal range around target; tightening to protect margin.  REVIEW CADENCE: In 7 days or after 30 new orders, whichever is later.  WAIT PERIOD: 7 days matured AND 30 new orders before the next change.", { italics: true, size: 15 }),

      h("6. Handoff notes and stated assumptions"),
      bullet("Five numbers drive nearly every review: the Primary-Window Adjusted ROAS, the Fast-Window Adjusted ROAS, matured order count, days since the last change, and orders since the last change. Everything else is a fixed, rarely-touched constant (see the companion workbook's Inputs tab)."),
      bullet("Minimum-confidence (30 orders) and wait-period (7 days / 30 orders) thresholds follow standard Smart Bidding relearning guidance and are treated as reasonable defaults, not measured from this account's data; a team with its own conversion-lag-to-relearning evidence should tune them."),
      bullet("Order-count and spend/revenue data are assumed to arrive daily, by the date the spend occurred (not the date the conversion posted), which is what lets the age-adjustment formula work at all."),
      bullet("A single ±10-point Target ROAS step and ±25% budget step are used for every intervention; combined with the wait-period gate, this makes the system self-throttling — it cannot make two changes in the same direction back-to-back without new evidence in between."),
      bullet("The full mechanics — including every threshold as an editable input, an audit trail of every intermediate calculation, and a live chart of raw vs. adjusted ROAS — live in the companion Campaign_Control_System.xlsx workbook. This page is the summary; the workbook is the system of record."),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  require("fs").writeFileSync("/tmp/claude-0/-home-user-paid-search-use-case/57d43694-ee27-5375-888e-e385fc115d10/scratchpad/Campaign_Control_System_Framework.docx", buf);
  console.log("written");
});
