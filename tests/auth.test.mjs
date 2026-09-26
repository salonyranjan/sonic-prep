import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(
    new URL("../lib/actions/auth.action.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;

function setup({
  invalid = false,
  age = 0,
  existing = false,
  failCookie = false,
} = {}) {
  const writes = [];
  const cookies = [];
  const claims = {
    uid: "verified-user",
    email: "verified@example.com",
    auth_time: Date.now() / 1000 - age,
  };
  const auth = {
    verifyIdToken: async () => {
      if (invalid) throw new Error("invalid token");
      return claims;
    },
    getUser: async () => ({ displayName: "Alex", email: claims.email }),
    createSessionCookie: async () => {
      if (failCookie) throw new Error("unavailable");
      return "session-value";
    },
  };
  const db = {
    collection: () => ({ doc: (id) => ({ id }) }),
    runTransaction: async (callback) =>
      callback({
        get: async () => ({ exists: existing }),
        set: (ref, data) => writes.push({ id: ref.id, ...data }),
      }),
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    process: { env: { NODE_ENV: "production" } },
    require: (name) => {
      if (name === "@/firebase/admin")
        return { getAdminServices: () => ({ auth, db }) };
      if (name === "next/headers")
        return {
          cookies: async () => ({ set: (...args) => cookies.push(args) }),
        };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { actions: exports, writes, cookies };
}

test("sign-in reports success and sets a protected session cookie", async () => {
  const { actions, cookies } = setup({ existing: true });
  assert.equal((await actions.signIn({ idToken: "token" })).success, true);
  assert.equal(cookies[0][0], "session");
  assert.equal(cookies[0][2].httpOnly, true);
  assert.equal(cookies[0][2].secure, true);
  assert.equal(cookies[0][2].sameSite, "lax");
});

test("sign-up uses verified identity, trims name, and signs the user in", async () => {
  const { actions, writes, cookies } = setup();
  const result = await actions.signUp({
    idToken: "token",
    name: " Alex ",
    uid: "forged-user",
    email: "forged@example.com",
  });
  assert.equal(result.success, true);
  assert.equal(writes[0].id, "verified-user");
  assert.equal(writes[0].email, "verified@example.com");
  assert.equal(writes[0].name, "Alex");
  assert.equal(cookies.length, 1);
});

test("invalid tokens cannot create profiles or sessions", async () => {
  const { actions, writes, cookies } = setup({ invalid: true });
  assert.equal(
    (await actions.signUp({ name: "Alex", idToken: "bad" })).success,
    false,
  );
  assert.equal(writes.length, 0);
  assert.equal(cookies.length, 0);
});

test("sign-in repairs interrupted profile setup", async () => {
  const { actions, writes } = setup();
  assert.equal((await actions.signIn({ idToken: "token" })).success, true);
  assert.equal(writes[0].id, "verified-user");
});

test("sign-up retry preserves an existing profile", async () => {
  const { actions, writes } = setup({ existing: true });
  assert.equal(
    (await actions.signUp({ name: "Alex", idToken: "token" })).success,
    true,
  );
  assert.equal(writes.length, 0);
});

test("expired login and cookie failures do not report success", async () => {
  for (const options of [{ age: 600 }, { failCookie: true }]) {
    const { actions, cookies } = setup(options);
    assert.equal((await actions.signIn({ idToken: "token" })).success, false);
    assert.equal(cookies.length, 0);
  }
});
