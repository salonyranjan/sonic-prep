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

function setup({
  secret = "test-secret",
  exists = true,
  fail = false,
  intentCompany,
} = {}) {
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
      "next/cache": { revalidatePath() {} },
      zod: { z },
      "@/firebase/admin": {
        getAdminServices: () => ({
          db: {
            collection: (name) => ({
              doc: () => ({
                get: async () => ({
                  exists,
                  data: () =>
                    name === "interviewIntents" && intentCompany
                      ? { company: intentCompany, startedAt: Date.now() }
                      : undefined,
                  ref: { delete: async () => {} },
                }),
              }),
              add: async (data) => writes.push(data),
            }),
          },
        }),
      },
      "@/lib/company": {
        getCompanyLogo: (company) =>
          company?.toLowerCase() === "adobe" ? "/covers/adobe.png" : null,
      },
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

test("generation stores the selected company and its matching logo", async () => {
  const app = setup();
  assert.equal(
    (await app.POST(request({ ...details, company: "Adobe" }))).status,
    200,
  );
  assert.equal(app.writes[0].company, "Adobe");
  assert.equal(app.writes[0].coverImage, "/covers/adobe.png");
});

test("generation uses the company selected before the voice call", async () => {
  const app = setup({ intentCompany: "Adobe" });
  assert.equal((await app.POST(request())).status, 200);
  assert.equal(app.writes[0].company, "Adobe");
  assert.equal(app.writes[0].coverImage, "/covers/adobe.png");
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
    [{ role: "assistant", content: "Welcome to the interview" }],
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

test("community interviews skip private and own records without a composite index", async () => {
  const calls = [];
  const own = Array.from({ length: 49 }, (_, index) => ({
    id: `own-${index}`,
    data: () => ({ userId: "demo-user", finalized: true }),
  }));
  own.push({
    id: "unfinished",
    data: () => ({ userId: "another-user", finalized: false }),
  });
  const other = {
    id: "community-interview",
    data: () => ({ userId: "another-user", finalized: true }),
  };
  const query = {
    where(field, operator, value) {
      calls.push(["where", field, operator, value]);
      return this;
    },
    orderBy(field, direction) {
      calls.push(["orderBy", field, direction]);
      return this;
    },
    limit(count) {
      calls.push(["limit", count]);
      return this;
    },
    startAfter(doc) {
      calls.push(["startAfter", doc.id]);
      return this;
    },
    async get() {
      return {
        docs: calls.some((call) => call[0] === "startAfter") ? [other] : own,
      };
    },
  };
  const { getLatestInterviews } = load("../lib/actions/general.action.ts", {
    ai: { generateObject() {} },
    "@ai-sdk/google": { google() {} },
    "next/cache": { revalidatePath() {} },
    "@/firebase/admin": {
      getAdminServices: () => ({ db: { collection: () => query } }),
    },
    "@/constants": { feedbackSchema: {} },
    "./auth.action": { getCurrentUser: async () => ({ id: "demo-user" }) },
    "@/lib/validation/interview": validation,
  });

  const results = await getLatestInterviews({ userId: "demo-user", limit: 1 });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "community-interview");
  assert.equal(
    calls.some((call) => call[2] === "!="),
    false,
  );
  assert.equal(
    calls.some((call) => call[0] === "where"),
    false,
  );
  assert.equal(
    calls.some((call) => call[0] === "startAfter"),
    true,
  );
});

test("an interview attempt is saved even when feedback generation fails", async () => {
  const saved = [];
  const db = {
    collection(name) {
      return {
        doc() {
          if (name === "interviews")
            return {
              get: async () => ({
                exists: true,
                data: () => ({ userId: "demo-user" }),
              }),
            };
          if (name === "interviewAttempts")
            return { set: async (data) => saved.push(data) };
          throw new Error(`Unexpected collection: ${name}`);
        },
      };
    },
  };
  const { createFeedback } = load(
    "../lib/actions/general.action.ts",
    {
      ai: {
        generateObject: async () => {
          throw new Error("AI unavailable");
        },
      },
      "@ai-sdk/google": { google: () => "test-model" },
      "next/cache": { revalidatePath() {} },
      "@/firebase/admin": { getAdminServices: () => ({ db }) },
      "@/constants": { feedbackSchema: {} },
      "./auth.action": { getCurrentUser: async () => ({ id: "demo-user" }) },
      "@/lib/validation/interview": validation,
    },
    { console: { error() {} } },
  );

  const result = await createFeedback({
    interviewId: "interview-1",
    userId: "demo-user",
    transcript: [{ role: "user", content: "My answer" }],
  });
  assert.equal(result.success, false);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].interviewId, "interview-1");
  assert.equal(saved[0].messageCount, 1);
});

test("feedback retries update one record and use the required score categories", async () => {
  const feedbackWrites = [];
  const prompts = [];
  const db = {
    collection(name) {
      return {
        doc(id) {
          if (name === "interviews")
            return {
              get: async () => ({
                exists: true,
                data: () => ({ userId: "demo-user" }),
              }),
            };
          if (name === "interviewAttempts") return { set: async () => {} };
          if (name === "feedback")
            return {
              id,
              set: async (data) => feedbackWrites.push({ id, data }),
            };
          throw new Error(`Unexpected collection: ${name}`);
        },
      };
    },
  };
  const { createFeedback } = load("../lib/actions/general.action.ts", {
    ai: {
      generateObject: async ({ prompt }) => {
        prompts.push(prompt);
        return {
          object: {
            totalScore: 80,
            categoryScores: [],
            strengths: [],
            areasForImprovement: [],
            finalAssessment: "Good answer",
          },
        };
      },
    },
    "@ai-sdk/google": { google: () => "test-model" },
    "next/cache": { revalidatePath() {} },
    "@/firebase/admin": { getAdminServices: () => ({ db }) },
    "@/constants": { feedbackSchema: {} },
    "./auth.action": { getCurrentUser: async () => ({ id: "demo-user" }) },
    "@/lib/validation/interview": validation,
  });

  const params = {
    interviewId: "interview-1",
    userId: "demo-user",
    transcript: [{ role: "user", content: "My answer" }],
  };
  assert.equal((await createFeedback(params)).success, true);
  assert.equal((await createFeedback(params)).success, true);
  assert.equal(feedbackWrites.length, 2);
  assert.equal(feedbackWrites[0].id, "demo-user_interview-1");
  assert.equal(feedbackWrites[1].id, "demo-user_interview-1");
  assert.ok(prompts[0].includes("Problem Solving"));
  assert.ok(prompts[0].includes("Confidence and Clarity"));
});

test("interview history includes completed community interviews and removes duplicates", async () => {
  const own = {
    id: "own-interview",
    data: () => ({ userId: "demo-user", createdAt: "2026-01-01T00:00:00Z" }),
  };
  const attempt = {
    data: () => ({
      interviewId: "community-interview",
      createdAt: "2026-02-01T00:00:00Z",
    }),
  };
  const feedback = {
    data: () => ({
      interviewId: "community-interview",
      createdAt: "2026-02-01T00:01:00Z",
    }),
  };
  const db = {
    collection(name) {
      return {
        where() {
          return this;
        },
        async get() {
          return {
            docs:
              name === "interviews"
                ? [own]
                : name === "interviewAttempts"
                  ? [attempt]
                  : [feedback],
          };
        },
        doc(id) {
          return { id };
        },
      };
    },
    async getAll(...refs) {
      return refs.map((ref) => ({
        id: ref.id,
        exists: true,
        data: () => ({
          userId: "another-user",
          finalized: true,
          createdAt: "2025-01-01T00:00:00Z",
        }),
      }));
    },
  };
  const { getInterviewsByUserId } = load("../lib/actions/general.action.ts", {
    ai: { generateObject() {} },
    "@ai-sdk/google": { google() {} },
    "next/cache": { revalidatePath() {} },
    "@/firebase/admin": { getAdminServices: () => ({ db }) },
    "@/constants": { feedbackSchema: {} },
    "./auth.action": { getCurrentUser: async () => ({ id: "demo-user" }) },
    "@/lib/validation/interview": validation,
  });

  const history = await getInterviewsByUserId("demo-user");
  assert.equal(history.length, 2);
  assert.equal(history[0].id, "community-interview");
  assert.equal(history[0].attempted, true);
  assert.equal(history[1].id, "own-interview");
});

test("a started practice interview is saved only for an authorized user", async () => {
  const writes = [];
  let visible = true;
  const db = {
    collection(name) {
      return {
        doc(id) {
          if (name === "interviews")
            return {
              get: async () => ({
                exists: true,
                data: () => ({ userId: "another-user", finalized: visible }),
              }),
            };
          if (name === "interviewAttempts")
            return { set: async (data) => writes.push({ id, data }) };
          throw new Error(`Unexpected collection: ${name}`);
        },
      };
    },
  };
  const { saveInterviewAttempt } = load("../lib/actions/general.action.ts", {
    ai: { generateObject() {} },
    "@ai-sdk/google": { google() {} },
    "next/cache": { revalidatePath() {} },
    "@/firebase/admin": { getAdminServices: () => ({ db }) },
    "@/constants": { feedbackSchema: {} },
    "./auth.action": { getCurrentUser: async () => ({ id: "demo-user" }) },
    "@/lib/validation/interview": validation,
  });

  assert.equal(
    (
      await saveInterviewAttempt({
        interviewId: "community",
        userId: "wrong-user",
      })
    ).success,
    false,
  );
  visible = false;
  assert.equal(
    (
      await saveInterviewAttempt({
        interviewId: "community",
        userId: "demo-user",
      })
    ).success,
    false,
  );
  visible = true;
  assert.equal(
    (
      await saveInterviewAttempt({
        interviewId: "community",
        userId: "demo-user",
      })
    ).success,
    true,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].id, "demo-user_community");
});

test("feedback lookup returns the user's newest result using a single-field query", async () => {
  const calls = [];
  const docs = [
    {
      id: "older",
      data: () => ({ userId: "demo-user", createdAt: "2026-01-01" }),
    },
    {
      id: "someone-else",
      data: () => ({ userId: "other-user", createdAt: "2026-03-01" }),
    },
    {
      id: "newer",
      data: () => ({ userId: "demo-user", createdAt: "2026-02-01" }),
    },
  ];
  const db = {
    collection() {
      return {
        where(...args) {
          calls.push(args);
          return this;
        },
        get: async () => ({ empty: false, docs }),
      };
    },
  };
  const { getFeedbackByInterviewId } = load(
    "../lib/actions/general.action.ts",
    {
      ai: { generateObject() {} },
      "@ai-sdk/google": { google() {} },
      "next/cache": { revalidatePath() {} },
      "@/firebase/admin": { getAdminServices: () => ({ db }) },
      "@/constants": { feedbackSchema: {} },
      "./auth.action": { getCurrentUser: async () => ({ id: "demo-user" }) },
      "@/lib/validation/interview": validation,
    },
  );

  const feedback = await getFeedbackByInterviewId({
    interviewId: "community",
    userId: "demo-user",
  });
  assert.equal(feedback.id, "newer");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "interviewId");
});

test("generation confirmation finds only interviews saved after the call began", async () => {
  const start = Date.now() - 5000;
  const docs = [
    { data: () => ({ createdAt: new Date(start - 1000).toISOString() }) },
  ];
  const db = {
    collection() {
      return {
        where(field, operator, value) {
          assert.equal(field, "userId");
          assert.equal(operator, "==");
          assert.equal(value, "demo-user");
          return this;
        },
        get: async () => ({ docs }),
      };
    },
  };
  const { beginInterviewGeneration, hasGeneratedInterviewSince } = load(
    "../lib/actions/general.action.ts",
    {
      ai: { generateObject() {} },
      "@ai-sdk/google": { google() {} },
      "next/cache": { revalidatePath() {} },
      "@/firebase/admin": { getAdminServices: () => ({ db }) },
      "@/constants": { feedbackSchema: {} },
      "./auth.action": { getCurrentUser: async () => ({ id: "demo-user" }) },
      "@/lib/validation/interview": validation,
    },
  );

  assert.equal(await beginInterviewGeneration("wrong-user"), null);
  assert.equal(
    await hasGeneratedInterviewSince({ userId: "demo-user", since: start }),
    false,
  );
  docs.push({
    data: () => ({ createdAt: new Date(start + 1000).toISOString() }),
  });
  assert.equal(
    await hasGeneratedInterviewSince({ userId: "demo-user", since: start }),
    true,
  );
});
