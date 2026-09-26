import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../lib/interview-report.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const exports = {};
vm.runInNewContext(source, { exports, Buffer });

function loadReportRoute({ user, interview, feedback }) {
  const routeSource = ts.transpileModule(
    readFileSync(
      new URL(
        "../app/(root)/interview/[id]/feedback/report/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const route = {};
  vm.runInNewContext(routeSource, {
    exports: route,
    Buffer,
    Response,
    require: (name) => {
      if (name === "@/lib/actions/auth.action")
        return { getCurrentUser: async () => user };
      if (name === "@/lib/actions/general.action")
        return {
          getInterviewById: async () => interview,
          getFeedbackByInterviewId: async () => feedback,
        };
      if (name === "@/lib/interview-report")
        return { buildInterviewReport: exports.buildInterviewReport };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return route;
}

test("downloadable report is a complete, two-page PDF with an improvement map", () => {
  const bytes = exports.buildInterviewReport(
    { role: "SEO Specialist", techstack: ["SEO"], company: "Amazon" },
    {
      createdAt: "2026-09-26T12:00:00Z",
      totalScore: 74,
      finalAssessment:
        "A solid foundation with room to strengthen technical examples.",
      categoryScores: [
        {
          name: "Technical Knowledge",
          score: 70,
          comment: "Explain crawlability in more detail.",
        },
      ],
      areasForImprovement: ["Give a concrete example of a site audit."],
      strengths: ["Clear communication"],
    },
    "Alex Morgan",
  );
  const pdf = Buffer.from(bytes).toString("ascii");
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.ok(pdf.includes("/Count 2"));
  assert.ok(pdf.includes("Technical SEO"));
  assert.ok(pdf.includes("Improvement mind map"));
  assert.ok(pdf.trimEnd().endsWith("%%EOF"));
});

test("long feedback is bounded and marked as shortened in the report", () => {
  const pdf = Buffer.from(
    exports.buildInterviewReport(
      { role: "Developer", techstack: [], company: null },
      {
        createdAt: "2026-09-26T12:00:00Z",
        totalScore: 60,
        finalAssessment: "Improve the answer structure. ".repeat(80),
        categoryScores: [
          {
            name: "Technical Knowledge",
            score: 55,
            comment: "Use specific examples. ".repeat(40),
          },
        ],
        strengths: [],
        areasForImprovement: ["Explain a concrete plan. ".repeat(40)],
      },
      "Candidate",
    ),
  ).toString("ascii");
  assert.ok(pdf.includes("..."));
  assert.ok(pdf.includes("Improvement mind map"));
  assert.ok(pdf.trimEnd().endsWith("%%EOF"));
});

test("report gives an improvement focus when the feedback has no improvement list", () => {
  const pdf = Buffer.from(
    exports.buildInterviewReport(
      { role: "Developer", techstack: [], company: null },
      {
        createdAt: "2026-09-26T12:00:00Z",
        totalScore: 60,
        finalAssessment: "Good foundation.",
        categoryScores: [
          {
            name: "Technical Knowledge",
            score: 55,
            comment: "Practice explaining tradeoffs.",
          },
        ],
        strengths: [],
        areasForImprovement: [],
      },
      "Candidate",
    ),
  ).toString("ascii");
  assert.ok(pdf.includes("Practice explaining tradeoffs."));
});

test("report download requires a signed-in user and their feedback", async () => {
  const context = { params: Promise.resolve({ id: "demo" }) };
  const interview = { role: "Developer", techstack: [] };
  const user = { id: "candidate", name: "Alex" };
  const unauthenticated = loadReportRoute({
    user: null,
    interview,
    feedback: null,
  });
  assert.equal(
    (await unauthenticated.GET(new Request("http://localhost/report"), context))
      .status,
    401,
  );
  const noFeedback = loadReportRoute({ user, interview, feedback: null });
  assert.equal(
    (await noFeedback.GET(new Request("http://localhost/report"), context))
      .status,
    404,
  );
});
