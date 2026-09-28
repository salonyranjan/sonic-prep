import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

function load(file, imports) {
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
    Response,
    Date,
    AbortSignal,
    console: { error() {} },
  });
  return exports;
}

const validation = load("../lib/validation/interview.ts", { zod: { z } });
const startedAt = Date.now();
const details = {
  role: "Frontend Developer",
  level: "Junior",
  type: "technical",
  techstack: "React, TypeScript",
  amount: 2,
  company: "amazon",
  startedAt,
};

function setup({
  user = { id: "candidate" },
  failAI = false,
  resumeText = "Built a React dashboard for sales reporting.",
  changedIntent = false,
} = {}) {
  const saved = new Map();
  const prompts = [];
  let deleted = 0;
  const db = {
    runTransaction: async (task) =>
      task({
        get: async () => ({
          data: () => ({
            startedAt: changedIntent ? startedAt + 1 : startedAt,
          }),
        }),
        delete: () => {
          deleted++;
        },
      }),
    collection(name) {
      return {
        doc(id) {
          if (name === "interviews")
            return {
              get: async () => ({ exists: saved.has(id) }),
              create: async (data) => {
                if (saved.has(id)) throw new Error("Already exists");
                saved.set(id, data);
              },
            };
          if (name === "interviewIntents")
            return {
              get: async () => ({
                data: () => (deleted ? undefined : { startedAt, resumeText }),
              }),
              delete: async () => {
                deleted++;
              },
            };
          throw new Error(`Unexpected collection: ${name}`);
        },
      };
    },
  };
  const { POST } = load("../app/api/interviews/route.ts", {
    "node:crypto": { createHash },
    ai: {
      generateObject: async ({ prompt }) => {
        prompts.push(JSON.parse(prompt));
        if (failAI) throw new Error("Provider unavailable");
        return {
          object: {
            questions: ["Generic question one?", "Generic question two?"],
          },
        };
      },
    },
    "@ai-sdk/google": { google: () => "test-model" },
    "next/cache": { revalidatePath() {} },
    zod: { z },
    "@/firebase/admin": { getAdminServices: () => ({ db }) },
    "@/lib/actions/auth.action": { getCurrentUser: async () => user },
    "@/lib/company": { getCompanyLogo: () => "/covers/amazon.png" },
    "@/lib/validation/interview": validation,
  });
  return { POST, saved, prompts, deleted: () => deleted };
}

function request(data = details) {
  return new Request("http://localhost/api/interviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

test("interview creation requires an account and valid role details", async () => {
  const anonymous = setup({ user: null });
  assert.equal((await anonymous.POST(request())).status, 401);
  const app = setup();
  assert.equal((await app.POST(request({ ...details, role: "" }))).status, 400);
  assert.equal(app.saved.size, 0);
});

test("interview is saved before success is returned, with resume-grounded questions", async () => {
  const app = setup();
  const response = await app.POST(request());
  assert.equal(response.status, 200);
  const { interviewId } = await response.json();
  assert.equal(app.saved.size, 1);
  assert.match(app.saved.get(interviewId).questions[0], /React dashboard/);
  assert.equal(app.saved.get(interviewId).userId, "candidate");
  assert.equal(app.saved.get(interviewId).coverImage, "/covers/amazon.png");
  assert.equal(
    app.prompts[0].resumeText,
    "Built a React dashboard for sales reporting.",
  );
  assert.equal(app.deleted(), 1);

  const retry = await app.POST(request());
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).interviewId, interviewId);
  assert.equal(app.saved.size, 1);
});

test("interview still saves usable questions when the AI provider fails", async () => {
  const app = setup({ failAI: true });
  const response = await app.POST(request());
  assert.equal(response.status, 200);
  const { interviewId } = await response.json();
  assert.equal(app.saved.get(interviewId).questions.length, 2);
  assert.match(app.saved.get(interviewId).questions[0], /React dashboard/);
});

test("a standard interview saves without a resume", async () => {
  const app = setup({ resumeText: undefined, failAI: true });
  const response = await app.POST(request());
  assert.equal(response.status, 200);
  const { interviewId } = await response.json();
  assert.equal(app.saved.get(interviewId).questions.length, 2);
  assert.match(app.saved.get(interviewId).questions[0], /Frontend Developer/);
});

test("saving an older interview preserves a newer setup", async () => {
  const app = setup({ changedIntent: true });
  assert.equal((await app.POST(request())).status, 200);
  assert.equal(app.saved.size, 1);
  assert.equal(app.deleted(), 0);
});
