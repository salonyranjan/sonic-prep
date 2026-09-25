import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import BrandLogo from "@/components/BrandLogo";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

type Interview = {
  id: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt: Date | string;
  attempted?: boolean;
  company?: string;
  coverImage?: string | null;
};
async function Home() {
  const user = await getCurrentUser();

  let userInterviewsRaw: Interview[] | null = null;
  let allInterviewRaw: Interview[] | null = null;
  let ownFailed = false;
  let communityFailed = false;

  if (user?.id) {
    const [ownResult, communityResult] = await Promise.allSettled([
      getInterviewsByUserId(user.id),
      getLatestInterviews({ userId: user.id }),
    ]);
    if (ownResult.status === "fulfilled") userInterviewsRaw = ownResult.value;
    else {
      ownFailed = true;
      console.error(
        "[Home] Failed to fetch your interviews:",
        ownResult.reason,
      );
    }
    if (communityResult.status === "fulfilled")
      allInterviewRaw = communityResult.value;
    else {
      communityFailed = true;
      console.error(
        "[Home] Failed to fetch community interviews:",
        communityResult.reason,
      );
    }
  }

  const userInterviews: Interview[] = Array.isArray(userInterviewsRaw)
    ? userInterviewsRaw
    : [];
  const allInterview: Interview[] = Array.isArray(allInterviewRaw)
    ? allInterviewRaw
    : [];

  const hasPastInterviews = userInterviews.length > 0;
  const hasUpcomingInterviews = allInterview.length > 0;

  return (
    <div className="flex flex-col text-foreground">
      <div className="flex w-full flex-1 flex-col gap-12">
        <section className="relative rounded-3xl bg-gradient-to-br from-violet-50 via-white to-cyan-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 border border-border shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-purple-500/5 to-violet-500/10 blur-3xl -z-10"></div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 p-6 sm:p-8 lg:p-12 relative z-10">
            <div className="flex flex-col gap-6 max-w-lg">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                Master Your Next Interview
                <span className="block text-violet-700 dark:text-primary-200 font-semibold">
                  with AI-powered practice
                </span>
              </h1>

              <p className="text-lg text-muted-foreground">
                Practice real‑time voice interviews and get instant technical &
                behavioral analysis.
              </p>

              <Button
                asChild
                size="lg"
                className="w-fit max-sm:w-full font-bold bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                <Link href="/interview">Start an Interview</Link>
              </Button>
            </div>

            <div className="max-sm:hidden w-60 h-60 md:w-72 md:h-72 flex-shrink-0">
              <Image
                src="/interview-assistant.webp"
                alt="SonicPrep AI Interview Assistant"
                width={500}
                height={500}
                priority
                className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.03]"
              />
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-foreground">
              Your Interviews
            </h2>
            {hasPastInterviews && (
              <span className="text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-600/30 font-medium">
                {userInterviews.length} Interview
                {userInterviews.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasPastInterviews ? (
              userInterviews.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  userId={user?.id ?? ""}
                  interviewId={interview.id}
                  role={interview.role}
                  type={interview.type}
                  techstack={
                    Array.isArray(interview.techstack)
                      ? interview.techstack
                      : []
                  }
                  attempted={interview.attempted}
                  company={interview.company}
                  createdAt={
                    typeof interview.createdAt === "string"
                      ? interview.createdAt
                      : interview.createdAt?.toISOString()
                  }
                />
              ))
            ) : ownFailed ? (
              <div className="col-span-full rounded-2xl border border-amber-400/20 bg-amber-400/5 p-8 text-center">
                <p className="text-zinc-700 dark:text-zinc-200">
                  Your interviews could not load.
                </p>
                <Link
                  href="/"
                  className="mt-3 inline-block text-sm font-semibold text-violet-700 dark:text-primary-200 underline underline-offset-4"
                >
                  Reload dashboard
                </Link>
              </div>
            ) : (
              <div className="col-span-full text-center py-16 bg-card backdrop-blur-sm rounded-xl border border-border">
                <p className="text-xl text-zinc-600 dark:text-zinc-400 font-semibold mb-2">
                  No interviews yet
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-500 mb-6 max-w-md mx-auto">
                  Get started by creating your first mock interview above.
                  Practice with AI‑powered voice feedback to sharpen your
                  skills.
                </p>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-800 dark:hover:text-emerald-200"
                >
                  <Link href="/interview">Create First Interview</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
        <section className="flex flex-col gap-8 mb-12">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-foreground">
              Explore Community Interviews
            </h2>
            {hasUpcomingInterviews && (
              <span className="text-sm text-cyan-800 dark:text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-600/30 font-medium">
                {allInterview.length} Available
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasUpcomingInterviews ? (
              allInterview.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  userId={user?.id ?? ""}
                  interviewId={interview.id}
                  role={interview.role}
                  company={interview.company}
                  type={interview.type}
                  techstack={
                    Array.isArray(interview.techstack)
                      ? interview.techstack
                      : []
                  }
                  createdAt={
                    typeof interview.createdAt === "string"
                      ? interview.createdAt
                      : interview.createdAt?.toISOString()
                  }
                />
              ))
            ) : communityFailed ? (
              <div className="col-span-full rounded-2xl border border-amber-400/20 bg-amber-400/5 p-8 text-center">
                <p className="text-zinc-700 dark:text-zinc-200">
                  Community interviews could not load.
                </p>
                <Link
                  href="/"
                  className="mt-3 inline-block text-sm font-semibold text-violet-700 dark:text-primary-200 underline underline-offset-4"
                >
                  Reload dashboard
                </Link>
              </div>
            ) : (
              <div className="col-span-full text-center py-16 bg-card backdrop-blur-sm rounded-xl border border-border">
                <p className="text-xl text-zinc-600 dark:text-zinc-400 font-semibold mb-2">
                  No public interviews yet
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-500 mb-6 max-w-md mx-auto">
                  Be the first to share one, or check back later as more users
                  publish their mock interviews.
                </p>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-cyan-500/60 hover:bg-cyan-500/10 hover:text-cyan-800 dark:hover:text-cyan-200"
                >
                  <Link href="/interview">Create Yours</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
      <footer className="flex items-center justify-center gap-2 py-6 text-center text-sm text-zinc-600 dark:text-zinc-500 border-t border-zinc-800">
        <BrandLogo size={24} className="shrink-0 rounded-md" />
        <span>
          © {new Date().getFullYear()} SonicPrep AI. Mock interviews that feel
          real.
        </span>
      </footer>
    </div>
  );
}

export default Home;
