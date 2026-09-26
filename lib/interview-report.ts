import type { Feedback, Interview } from "@/types";

const W = 595;
const H = 842;
const ink = "0.10 0.15 0.24";
const muted = "0.38 0.43 0.51";
const accent = "0.30 0.22 0.67";

function plain(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safe(value: unknown) {
  return plain(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function short(value: string, limit: number) {
  const cleaned = plain(value);
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
}

function wrap(value: string, width: number, fontSize: number) {
  const words = plain(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const max = Math.max(12, Math.floor(width / (fontSize * 0.51)));
  for (const originalWord of words) {
    let word = originalWord;
    while (word.length > max) {
      if (line) lines.push(line);
      lines.push(word.slice(0, max - 1) + "-");
      word = word.slice(max - 1);
      line = "";
    }
    if (line && `${line} ${word}`.length > max) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

function page() {
  const commands: string[] = [];
  const text = (
    x: number,
    y: number,
    value: string,
    size = 11,
    bold = false,
    color = ink,
  ) => {
    commands.push(
      `${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${H - y} Tm (${safe(value)}) Tj ET`,
    );
  };
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    commands.push(`${color} rg ${x} ${H - y - h} ${w} ${h} re f`);
  };
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = "0.82 0.84 0.89",
  ) => {
    commands.push(`${color} RG 1 w ${x1} ${H - y1} m ${x2} ${H - y2} l S`);
  };
  const paragraph = (
    x: number,
    y: number,
    value: string,
    width: number,
    size = 10,
    leading = 15,
    color = ink,
    limit = 20,
  ) => {
    const wrapped = wrap(value, width, size);
    const rows = wrapped.slice(0, limit);
    if (wrapped.length > limit && rows.length)
      rows[rows.length - 1] = rows[rows.length - 1].slice(0, -3) + "...";
    rows.forEach((row, index) =>
      text(x, y + index * leading, row, size, false, color),
    );
    return y + rows.length * leading;
  };
  return { commands, text, rect, line, paragraph };
}

export function buildInterviewReport(
  interview: Interview,
  feedback: Feedback,
  candidate: string,
): Uint8Array {
  const pages = [page(), page()];
  const [p1, p2] = pages;
  const role = interview.role || "Practice";
  const date =
    feedback.createdAt && !Number.isNaN(Date.parse(feedback.createdAt))
      ? new Date(feedback.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        })
      : "Date unavailable";
  const technical = /seo|search engine optim/i.test(
    `${role} ${interview.techstack?.join(" ")}`,
  )
    ? "Technical SEO: audit crawlability, indexation, Core Web Vitals, structured data, and search intent. Explain a prioritized fix and how you would measure its result."
    : `Technical knowledge: review the core concepts for ${role}, explain tradeoffs aloud, and support each answer with a concrete example.`;

  for (const [index, p] of pages.entries()) {
    p.rect(0, 0, W, 10, accent);
    p.text(42, 40, "SONICPREP  /  INTERVIEW REPORT", 10, true, accent);
    p.text(
      42,
      812,
      "Private practice feedback  |  Based on the recorded interview transcript",
      8,
      false,
      muted,
    );
    p.text(527, 812, `${index + 1} / 2`, 8, true, muted);
    p.line(42, 795, 553, 795);
  }
  p1.text(42, 86, short(`${role} Interview`, 38), 24, true);
  p1.text(
    42,
    111,
    `${short(candidate, 28)}  |  ${date}${interview.company ? `  |  ${short(interview.company, 26)}` : ""}`,
    10,
    false,
    muted,
  );
  p1.rect(42, 138, 511, 74, "0.95 0.94 0.99");
  p1.text(58, 166, "OVERALL SCORE", 10, true, accent);
  p1.text(58, 197, `${Math.round(feedback.totalScore)} / 100`, 25, true);
  p1.text(42, 245, "Assessment", 16, true);
  let y =
    p1.paragraph(42, 267, feedback.finalAssessment, 511, 10, 16, ink, 4) + 18;
  p1.text(42, y, "Performance by category", 16, true);
  y += 23;
  for (const item of feedback.categoryScores.slice(0, 5)) {
    p1.text(42, y, item.name, 10, true);
    p1.text(515, y, `${Math.round(item.score)}/100`, 10, true, accent);
    p1.rect(42, y + 8, 511, 4, "0.89 0.90 0.94");
    p1.rect(
      42,
      y + 8,
      (511 * Math.max(0, Math.min(100, item.score))) / 100,
      4,
      accent,
    );
    y = p1.paragraph(42, y + 27, item.comment, 511, 9, 13, muted, 2) + 14;
  }
  if (y < 688) {
    p1.text(42, y + 4, "Strengths observed", 14, true);
    y += 27;
    for (const strength of feedback.strengths.slice(0, 2))
      y = p1.paragraph(52, y, `- ${strength}`, 490, 9, 13, ink, 2) + 5;
  }

  p2.text(42, 86, "Your improvement plan", 23, true);
  p2.text(
    42,
    110,
    "Focus on the highest-impact actions before your next practice session.",
    10,
    false,
    muted,
  );
  let planY = 145;
  const improvements = feedback.areasForImprovement
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!improvements.length) {
    const focus = [...feedback.categoryScores].sort(
      (a, b) => a.score - b.score,
    )[0];
    improvements.push(
      focus?.comment?.trim() ||
        "Review your lowest-scoring answer and practice a clearer example.",
    );
  }
  for (const [index, item] of improvements.entries()) {
    p2.rect(42, planY, 511, 64, "0.96 0.97 0.99");
    p2.text(56, planY + 21, `0${index + 1}`, 12, true, accent);
    p2.paragraph(94, planY + 20, item, 440, 10, 14, ink, 3);
    planY += 76;
  }
  p2.text(42, planY + 5, "Technical knowledge focus", 14, true);
  planY = p2.paragraph(42, planY + 29, technical, 511, 10, 15, ink, 4) + 22;
  p2.text(42, planY, "Improvement mind map", 14, true);
  const cy = planY + 100;
  p2.line(297, cy, 120, cy - 38, accent);
  p2.line(297, cy, 474, cy - 38, accent);
  p2.line(297, cy, 120, cy + 48, accent);
  p2.line(297, cy, 474, cy + 48, accent);
  const node = (x: number, yy: number, title: string, subtitle: string) => {
    p2.rect(x, yy, 144, 44, "0.94 0.93 0.98");
    p2.text(x + 9, yy + 17, title, 9, true, accent);
    p2.text(x + 9, yy + 32, subtitle, 8, false, muted);
  };
  node(225, cy - 22, "NEXT INTERVIEW", "Practice, review, repeat");
  node(42, cy - 81, "KNOWLEDGE", "Review core concepts");
  node(409, cy - 81, "EVIDENCE", "Use specific examples");
  node(42, cy + 30, "DELIVERY", "Structure each answer");
  node(409, cy + 30, "REFLECTION", "Track one improvement");
  p2.text(42, Math.min(cy + 130, 760), "Suggested routine", 14, true);
  p2.paragraph(
    42,
    Math.min(cy + 154, 780),
    "Choose one point above. Practice a two-minute answer, record it, compare it with the feedback, and repeat the interview to measure progress.",
    511,
    10,
    15,
    ink,
    3,
  );

  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldId = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );
  const pageIds: number[] = [];
  for (const p of pages) {
    const stream = p.commands.join("\n") + "\n";
    const streamId = add(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    );
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${streamId} 0 R >>`,
      ),
    );
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, body] of objects.entries()) {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(output, "ascii"));
}
