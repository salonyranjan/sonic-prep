import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function formApp({ expire = false } = {}) {
  const hooks = [];
  let cursor = 0;
  let begins = 0;
  let uploads = 0;
  let saves = 0;
  const destinations = [];
  const source = ts.transpileModule(
    readFileSync(
      new URL("../components/CreateInterviewForm.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const imports = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useRef(value) {
        const index = cursor++;
        return (hooks[index] ??= { current: value });
      },
      useState(value) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = value;
        return [
          hooks[index],
          (next) => {
            hooks[index] = next;
          },
        ];
      },
    },
    "next/navigation": {
      useRouter: () => ({
        push: (path) => destinations.push(path),
        refresh() {},
      }),
    },
    "@/lib/actions/general.action": {
      beginInterviewGeneration: async () => ++begins,
    },
    "@/lib/company": { companyOptions: [] },
  };
  vm.runInNewContext(source, {
    exports,
    require: (name) => imports[name],
    FormData,
    fetch: async (url) => {
      if (url === "/api/resume") {
        uploads++;
        return Response.json({ success: true });
      }
      saves++;
      if (saves === 1) {
        if (expire)
          return Response.json({ message: "Setup expired" }, { status: 409 });
        throw new Error("Response lost after save");
      }
      return Response.json({ interviewId: "saved-interview" });
    },
  });
  function render() {
    cursor = 0;
    return exports.default({ userId: "candidate" });
  }
  function find(node, predicate) {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children)
      ? children.flat(Infinity)
      : [children]) {
      const found = find(child, predicate);
      if (found) return found;
    }
  }
  const input = find(
    render(),
    (node) => node.type === "input" && node.props.type === "file",
  );
  input.props.onChange({
    target: { files: [new File(["%PDF-1.7"], "resume.pdf")] },
  });
  return {
    submit: () =>
      find(render(), (node) => node.type === "form").props.onSubmit({
        preventDefault() {},
      }),
    counts: () => ({ begins, uploads, saves }),
    destinations,
  };
}

test("resume retry reuses extraction and recovers a lost save response", async () => {
  const app = formApp();
  await app.submit();
  await app.submit();
  assert.deepEqual(app.counts(), { begins: 1, uploads: 1, saves: 2 });
  assert.deepEqual(app.destinations, ["/interview/saved-interview"]);
});

test("an expired setup is renewed on the next retry", async () => {
  const app = formApp({ expire: true });
  await app.submit();
  await app.submit();
  assert.deepEqual(app.counts(), { begins: 2, uploads: 2, saves: 2 });
  assert.deepEqual(app.destinations, ["/interview/saved-interview"]);
});
