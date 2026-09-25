import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { timingSafeEqual } from "node:crypto";
import ts from "typescript";
import { z } from "zod";

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
    ...globals,
  });
  return exports;
}

const validation = load("../lib/validation/interview.ts", { zod: { z } });
const details = {
  type: "Technical",
  role: "Frontend Developer",
  level: "Junior",
  techstack: "React, TypeScript, ",
  amount: "2",
  userid: "demo-user",
};

function setup({ secret = "test-secret", exists = true, fail = false } = {}) {
  const writes = [];
  let generations = 0;
  const { POST } = load(
    "../app/api/vapi/generate/route.ts",
    {
      "node:crypto": { timingSafeEqual },
      ai: {
        generateObject: async () => {
          generations++;
          if (fail) throw new Error("private provider detail");
          return {
            object: { questions: ["Explain components.", "Explain state."] },
          };
        },
      },
      "@ai-sdk/google": { google: () => "test-model" },
      zod: { z },
      "@/firebase/admin": {
        getAdminServices: () => ({
          db: {
            collection: () => ({
              doc: () => ({ get: async () => ({ exists }) }),
              add: async (data) => writes.push(data),
            }),
          },
        }),
      },
      "@/lib/utils": { getRandomInterviewCover: () => "/covers/adobe.png" },
      "@/lib/validation/interview": validation,
    },
    {
      Buffer,
      Response,
      process: { env: { VAPI_WEBHOOK_SECRET: secret } },
      console: { error() {} },
    },
  );
  return { POST, writes, generations: () => generations };
}

function request(body = details, authorization = "Bearer test-secret") {
  return new Request("http://localhost/api/vapi/generate", {
    method: "POST",
    headers: { authorization },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("generation rejects missing or incorrect authorization before spending API credits", async () => {
  const app = setup();
  for (const token of ["", "Bearer wrong", "Bearer test-secrex"])
    assert.equal((await app.POST(request(details, token))).status, 401);
  assert.equal(app.generations(), 0);
  assert.equal(app.writes.length, 0);
});

test("generation fails closed when no webhook secret is configured", async () => {
  const app = setup({ secret: "" });
  assert.equal((await app.POST(request())).status, 503);
});

test("generation reports malformed JSON and oversized bodies as client errors", async () => {
  const app = setup();
  assert.equal((await app.POST(request("{"))).status, 400);
  assert.equal((await app.POST(request("x".repeat(17000)))).status, 413);
  assert.equal(app.generations(), 0);
});

test("generation rejects out-of-range question counts and invalid document IDs", async () => {
  const app = setup();
  for (const patch of [
    { amount: 0 },
    { amount: 21 },
    { amount: 2.5 },
    { userid: "users/other" },
    { techstack: ", ," },
  ]) {
    assert.equal(
      (await app.POST(request({ ...details, ...patch }))).status,
      400,
    );
  }
  assert.equal(app.generations(), 0);
});

test("generation requires an existing account", async () => {
  const app = setup({ exists: false });
  assert.equal((await app.POST(request())).status, 404);
  assert.equal(app.generations(), 0);
});

test("generation normalizes input and stores validated questions", async () => {
  const app = setup();
  assert.equal((await app.POST(request())).status, 200);
  assert.equal(app.writes[0].type, "technical");
  assert.deepEqual(Array.from(app.writes[0].techstack), [
    "React",
    "TypeScript",
  ]);
  assert.equal(app.writes[0].questions.length, 2);
  assert.equal(app.writes[0].userId, "demo-user");
});

test("generation does not return private provider errors", async () => {
  const app = setup({ fail: true });
  const response = await app.POST(request());
  assert.equal(response.status, 500);
  assert.equal(
    (await response.text()).includes("private provider detail"),
    false,
  );
  assert.equal(app.writes.length, 0);
});

test("feedback rejects empty, oversized, and malformed transcripts", () => {
  const base = { userId: "demo-user", interviewId: "frontend" };
  for (const transcript of [
    [],
    [{ role: "invalid", content: "Hello" }],
    [{ role: "user", content: "x".repeat(8001) }],
  ]) {
    assert.equal(
      validation.feedbackRequestSchema.safeParse({ ...base, transcript })
        .success,
      false,
    );
  }
  assert.equal(
    validation.feedbackRequestSchema.safeParse({
      ...base,
      transcript: [{ role: "user", content: "My answer" }],
    }).success,
    true,
  );
});
