"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { beginInterviewGeneration } from "@/lib/actions/general.action";
import { companyOptions } from "@/lib/company";

export default function CreateInterviewForm({ userId }: { userId: string }) {
  const router = useRouter();
  const startedAt = useRef<number | null>(null);
  const busy = useRef(false);
  const resumeUploadedAt = useRef<number | null>(null);
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("Junior");
  const [type, setType] = useState("mixed");
  const [techstack, setTechstack] = useState("");
  const [amount, setAmount] = useState(5);
  const [company, setCompany] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "reading" | "creating">("idle");
  const [error, setError] = useState("");

  const fieldClass =
    "mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setStage("creating");
    setError("");
    try {
      if (
        resume &&
        (resume.size > 4 * 1024 * 1024 ||
          !resume.name.toLowerCase().endsWith(".pdf"))
      )
        throw new Error("Choose a PDF resume smaller than 4 MB.");

      if (!startedAt.current) {
        startedAt.current = await beginInterviewGeneration(userId, company);
        if (!startedAt.current)
          throw new Error("Please sign in again before creating an interview.");
      }

      if (resume && resumeUploadedAt.current !== startedAt.current) {
        setStage("reading");
        const form = new FormData();
        form.set("resume", resume);
        const upload = await fetch("/api/resume", {
          method: "POST",
          body: form,
        });
        const result = await upload.json().catch(() => ({}));
        if (!upload.ok) {
          if (upload.status === 409) startedAt.current = null;
          throw new Error(result.message || "Could not read your resume.");
        }
        resumeUploadedAt.current = startedAt.current;
      }

      setStage("creating");
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          type,
          techstack,
          amount,
          company,
          startedAt: startedAt.current,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.interviewId) {
        if (response.status === 409) startedAt.current = null;
        throw new Error(result.message || "Could not save your interview.");
      }
      router.push(`/interview/${result.interviewId}`);
      router.refresh();
    } catch (cause) {
      busy.current = false;
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create your interview. Please try again.",
      );
      setStage("idle");
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-lg sm:p-8">
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Create an interview
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Tell us the role you want to practice. We will save your questions
        before voice practice begins.
      </p>
      <form
        onSubmit={submit}
        className="mt-7 space-y-5"
        aria-busy={stage !== "idle"}
      >
        <fieldset
          disabled={stage !== "idle"}
          className="space-y-5 disabled:opacity-70"
        >
          <label className="block text-sm font-medium text-foreground">
            Role
            <input
              className={fieldClass}
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                startedAt.current = null;
              }}
              required
              minLength={2}
              maxLength={120}
              placeholder="Frontend Developer"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              Experience level
              <select
                className={fieldClass}
                value={level}
                onChange={(event) => {
                  setLevel(event.target.value);
                  startedAt.current = null;
                }}
              >
                <option>Junior</option>
                <option>Mid-level</option>
                <option>Senior</option>
                <option>Lead</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Interview type
              <select
                className={fieldClass}
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  startedAt.current = null;
                }}
              >
                <option value="mixed">Mixed</option>
                <option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-foreground">
            Skills or technologies
            <input
              className={fieldClass}
              value={techstack}
              onChange={(event) => {
                setTechstack(event.target.value);
                startedAt.current = null;
              }}
              required
              maxLength={500}
              placeholder="React, TypeScript, CSS"
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Separate each skill with a comma.
            </span>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              Number of questions
              <input
                className={fieldClass}
                type="number"
                min={1}
                max={20}
                value={amount}
                onChange={(event) => {
                  setAmount(Number(event.target.value));
                  startedAt.current = null;
                }}
                required
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Company{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
              <select
                className={fieldClass}
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value);
                  startedAt.current = null;
                }}
              >
                <option value="">No company</option>
                {companyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option[0].toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-foreground">
            Resume PDF{" "}
            <span className="font-normal text-muted-foreground">
              (optional, up to 4 MB)
            </span>
            <input
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-white"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                setResume(event.target.files?.[0] ?? null);
                startedAt.current = null;
              }}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              We read it once to make questions about your experience and chosen
              role.
            </span>
          </label>
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-700 dark:text-red-200"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={stage !== "idle"}
          className="w-full rounded-xl bg-gradient-to-r from-purple-700 to-blue-700 px-6 py-4 font-semibold text-white disabled:opacity-60"
        >
          {stage === "reading"
            ? "Reading resume..."
            : stage === "creating"
              ? "Generating and saving interview..."
              : "Create interview"}
        </button>
      </form>
    </section>
  );
}
