import type { RouteParams } from "@/types";
import dayjs from "dayjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });
  if (!feedback) redirect(`/interview/${id}`);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-12 text-foreground dark:text-white">
      <header className="grid gap-6 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-100 via-white to-cyan-100 dark:from-[#211d3b] dark:via-[#121827] dark:to-[#0d2027] p-6 shadow-2xl shadow-black/20 sm:grid-cols-[1fr_auto] sm:items-center sm:p-9">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-300">
            Your interview feedback
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold capitalize tracking-tight sm:text-4xl">
            {interview.role} Interview
          </h1>
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            {feedback.createdAt && dayjs(feedback.createdAt).isValid()
              ? dayjs(feedback.createdAt).format("MMM D, YYYY · h:mm A")
              : "Date unavailable"}
          </p>
        </div>
        <div className="flex size-32 flex-col items-center justify-center rounded-full border-8 border-cyan-300/60 bg-cyan-300/10 shadow-lg shadow-cyan-500/10">
          <span className="text-4xl font-bold text-foreground dark:text-white">
            {feedback.totalScore}
          </span>
          <span className="text-xs text-cyan-800 dark:text-cyan-100">
            out of 100
          </span>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-white/90 dark:bg-zinc-900/70 p-6 sm:p-8">
        <h2 className="mb-3 text-xl font-semibold text-foreground dark:text-white">
          Your assessment
        </h2>
        <p className="leading-7 text-zinc-700 dark:text-zinc-300">
          {feedback.finalAssessment}
        </p>
      </div>

      <section
        className="rounded-2xl border border-border bg-white/90 dark:bg-zinc-900/70 p-6 sm:p-8"
        aria-labelledby="breakdown-heading"
      >
        <h2
          id="breakdown-heading"
          className="mb-6 text-xl font-semibold text-foreground dark:text-white"
        >
          Score breakdown
        </h2>
        <div className="space-y-7">
          {feedback.categoryScores.map((category) => (
            <div key={category.name}>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <h3 className="text-base font-semibold text-foreground dark:text-white">
                  {category.name}
                </h3>
                <span className="shrink-0 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                  {category.score}/100
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
                role="meter"
                aria-label={category.name}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={category.score}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                  style={{ width: `${category.score}%` }}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {category.comment}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 sm:p-8"
          aria-labelledby="strengths-heading"
        >
          <h2
            id="strengths-heading"
            className="mb-4 text-xl font-semibold text-emerald-800 dark:text-emerald-200"
          >
            Strengths
          </h2>
          <ul className="list-disc space-y-3 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
            {feedback.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </section>
        <section
          className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 sm:p-8"
          aria-labelledby="improvements-heading"
        >
          <h2
            id="improvements-heading"
            className="mb-4 text-xl font-semibold text-amber-800 dark:text-amber-200"
          >
            Areas to improve
          </h2>
          <ul className="list-disc space-y-3 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
            {feedback.areasForImprovement.map((area, index) => (
              <li key={index}>{area}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          variant="outline"
          className="min-h-11 flex-1 border-white/20 bg-transparent text-foreground dark:text-white hover:bg-white/10 hover:text-foreground dark:text-white"
        >
          <Link href="/">Back to dashboard</Link>
        </Button>
        <Button
          asChild
          className="min-h-11 flex-1 bg-primary-200 font-semibold text-dark-100 hover:bg-primary-100"
        >
          <Link href={`/interview/${id}`}>Retake interview</Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;
