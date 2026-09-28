import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";

function load(file, imports, globals = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
    Buffer,
    File,
    Response,
    Date,
    console: { error() {} },
    ...globals,
  });
  return exports;
}

const validPdf = new File(["%PDF-1.7\nresume"], "resume.pdf", {
  type: "application/pdf",
});

function uploadRequest(file = validPdf) {
  const body = new FormData();
  body.set("resume", file);
  return new Request("http://localhost/api/resume", { method: "POST", body });
}

function uploadApp({
  user = { id: "candidate" },
  startedAt = Date.now(),
  extractedText = "Built a React dashboard.",
  finishReason = "stop",
} = {}) {
  let calls = 0;
  let stored;
  const intentRef = {
    get: async () => ({ data: () => ({ startedAt }) }),
  };
  const db = {
    collection: (name) => {
      assert.equal(name, "interviewIntents");
      return {
        doc: (id) => {
          assert.equal(id, "candidate");
          return intentRef;
        },
      };
    },
    runTransaction: async (task) =>
      task({
        get: intentRef.get,
        update: (_ref, value) => {
          stored = value;
        },
      }),
  };
  const { POST } = load("../app/api/resume/route.ts", {
    ai: {
      generateText: async ({ messages, system }) => {
        calls++;
        assert.equal(messages[0].content[1].mediaType, "application/pdf");
        assert.match(system, /Read every page/);
        return { text: extractedText, finishReason };
      },
    },
    "@ai-sdk/google": { google: () => "test-model" },
    "@/firebase/admin": { getAdminServices: () => ({ db }) },
    "@/lib/actions/auth.action": { getCurrentUser: async () => user },
  });
  return { POST, calls: () => calls, stored: () => stored };
}

test("resume upload requires a session and a valid recent interview intent", async () => {
  const anonymous = uploadApp({ user: null });
  assert.equal((await anonymous.POST(uploadRequest())).status, 401);
  assert.equal(anonymous.calls(), 0);

  const stale = uploadApp({ startedAt: Date.now() - 61 * 60 * 1000 });
  assert.equal((await stale.POST(uploadRequest())).status, 409);
  assert.equal(stale.calls(), 0);
});

test("resume upload rejects invalid and oversized PDFs before using AI", async () => {
  const app = uploadApp();
  const fake = new File(["hello"], "resume.pdf", { type: "application/pdf" });
  const oversized = new File(
    [new Uint8Array(4 * 1024 * 1024 + 1)],
    "resume.pdf",
    {
      type: "application/pdf",
    },
  );
  assert.equal((await app.POST(uploadRequest(fake))).status, 400);
  assert.equal((await app.POST(uploadRequest(oversized))).status, 400);
  assert.equal(app.calls(), 0);
});

test("resume upload stores detailed extracted content without shortening it", async () => {
  const content = "Built a React dashboard. ".repeat(300);
  const app = uploadApp({ extractedText: content });
  assert.equal((await app.POST(uploadRequest())).status, 200);
  assert.equal(app.calls(), 1);
  assert.equal(app.stored().resumeText, content.trim());
  assert.equal(Object.keys(app.stored()).join(","), "resumeText");

  const invalid = uploadApp({ extractedText: "NOT_A_RESUME" });
  assert.equal((await invalid.POST(uploadRequest())).status, 422);
  assert.equal(invalid.stored(), undefined);

  const tooLong = uploadApp({ extractedText: "x".repeat(32_001) });
  assert.equal((await tooLong.POST(uploadRequest())).status, 422);
  assert.equal(tooLong.stored(), undefined);
});

test("resume upload accepts a PDF when the browser omits its MIME type", async () => {
  const file = new File(["header\n%PDF-1.7\nresume"], "resume.pdf");
  const app = uploadApp();
  assert.equal((await app.POST(uploadRequest(file))).status, 200);
  assert.equal(app.calls(), 1);
});

test("generated questions receive resume context only from a recent intent", async () => {
  const validation = load("../lib/validation/interview.ts", { zod: { z } });
  const prompts = [];
  const writes = [];
  const background = [];
  let age = 0;
  let deleted = 0;
  const { POST } = load(
    "../app/api/vapi/generate/route.ts",
    {
      "node:crypto": { timingSafeEqual },
      ai: {
        generateObject: async ({ prompt }) => {
          prompts.push(JSON.parse(prompt));
          return {
            object: { questions: ["Tell me about yourself."] },
          };
        },
      },
      "@ai-sdk/google": { google: () => "test-model" },
      "next/cache": { revalidatePath() {} },
      "next/server": { after: (callback) => background.push(callback) },
      zod: { z },
      "@/firebase/admin": {
        getAdminServices: () => ({
          db: {
            collection: (name) => ({
              doc: () => ({
                get: async () =>
                  name === "users"
                    ? { exists: true }
                    : {
                        data: () => ({
                          startedAt: Date.now() - age,
                          resumeText:
                            "Built a React dashboard for sales reporting.",
                        }),
                        ref: {
                          delete: async () => {
                            deleted++;
                          },
                        },
                      },
              }),
              add: async (data) => {
                writes.push(data);
              },
            }),
          },
        }),
      },
      "@/lib/company": { getCompanyLogo: () => null },
      "@/lib/validation/interview": validation,
    },
    { process: { env: { VAPI_WEBHOOK_SECRET: "test-secret" } } },
  );
  const body = JSON.stringify({
    type: "technical",
    role: "Developer",
    level: "Junior",
    techstack: "React",
    amount: 1,
    userid: "candidate",
  });
  const request = () =>
    new Request("http://localhost/api/vapi/generate", {
      method: "POST",
      headers: { authorization: "Bearer test-secret" },
      body,
    });

  assert.equal((await POST(request())).status, 200);
  assert.equal(writes.length, 0);
  assert.equal(background.length, 1);
  await background[0]();
  assert.equal(
    prompts[0].resumeText,
    "Built a React dashboard for sales reporting.",
  );
  assert.equal(deleted, 1);
  assert.equal("resumeText" in writes[0], false);
  assert.match(writes[0].questions[0], /React dashboard/);
  assert.match(writes[0].questions[0], /Developer/);

  age = 61 * 60 * 1000;
  assert.equal((await POST(request())).status, 200);
  assert.equal("resumeText" in prompts[1], false);
  assert.equal(writes[1].questions[0], "Tell me about yourself.");
});

test("starting another interview clears the previous resume context", async () => {
  const writes = [];
  const validation = load("../lib/validation/interview.ts", { zod: { z } });
  const { beginInterviewGeneration } = load(
    "../lib/actions/general.action.ts",
    {
      ai: { generateObject() {} },
      "@ai-sdk/google": { google() {} },
      "next/cache": { revalidatePath() {} },
      "@/firebase/admin": {
        getAdminServices: () => ({
          db: {
            collection: () => ({
              doc: () => ({ set: async (value) => writes.push(value) }),
            }),
          },
        }),
      },
      "@/constants": { feedbackSchema: {} },
      "./auth.action": { getCurrentUser: async () => ({ id: "candidate" }) },
      "@/lib/validation/interview": validation,
    },
  );

  assert.equal(typeof (await beginInterviewGeneration("candidate")), "number");
  assert.equal(writes[0].company, null);
  assert.equal("resumeText" in writes[0], false);
});

test("a truncated resume is rejected instead of silently accepted", async () => {
  const app = uploadApp({ finishReason: "length" });
  assert.equal((await app.POST(uploadRequest())).status, 422);
  assert.equal(app.stored(), undefined);
});
