import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";

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
};

// ✅ Server Component
async function Home() {
  let user = null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("[Home] Failed to fetch user:", error);
  }

  let userInterviewsRaw: Interview[] | null = null;
  let allInterviewRaw: Interview[] | null = null;

  try {
    const [uI, aI] = await Promise.all([
      user?.id
        ? getInterviewsByUserId(user.id)
        : Promise.resolve([]),
      user?.id
        ? getLatestInterviews({ userId: user.id })
        : Promise.resolve([]),
    ]);
    userInterviewsRaw = uI;
    allInterviewRaw = aI;
  } catch (error) {
    console.error("[Home] Failed to fetch interviews:", error);
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
    <div className="flex min-h-screen flex-col bg-zinc-900 text-white">
      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col gap-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Banner Section */}
        <section className="relative rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/70 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-purple-500/5 to-violet-500/10 blur-3xl -z-10"></div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10 p-8 lg:p-12 relative z-10">
            <div className="flex flex-col gap-6 max-w-lg">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                Master Your Next Interview
                <span className="block text-cyan-400 font-extrabold">
                  with Sonic‑Speed AI Feedback
                </span>
              </h1>

              <p className="text-lg text-zinc-300">
                Practice real‑time voice interviews and get instant technical & behavioral analysis.
              </p>

              <Button
                asChild
                size="lg"
                className="w-fit max-sm:w-full font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                <Link href="/interview">Start an Interview</Link>
              </Button>
            </div>

            <div className="max-sm:hidden w-60 h-60 md:w-72 md:h-72 flex-shrink-0">
              <Image
                src="/robot1.png"
                alt="SonicPrep AI Interview Assistant"
                width={280}
                height={280}
                priority
                className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.03]"
              />
            </div>
          </div>
        </section>

        {/* Your Interviews Section */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-white">Your Interviews</h2>
            {hasPastInterviews && (
              <span className="text-sm text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-600/30 font-medium">
                {userInterviews.length} Interview{userInterviews.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="interviews-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasPastInterviews ? (
              userInterviews.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  userId={user?.id ?? ""}
                  interviewId={interview.id}
                  role={interview.role}
                  type={interview.type}
                  techstack={interview.techstack}
                  createdAt={
                    typeof interview.createdAt === "string"
                      ? interview.createdAt
                      : interview.createdAt?.toISOString()
                  }
                />
              ))
            ) : (
              <div className="col-span-full text-center py-16 bg-zinc-900/40 backdrop-blur-sm rounded-xl border border-zinc-800/60">
                <p className="text-xl text-zinc-400 font-semibold mb-2">No interviews yet</p>
                <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                  Get started by creating your first mock interview above. Practice with AI‑powered voice feedback to sharpen your skills.
                </p>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-200"
                >
                  <Link href="/interview">Create First Interview</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Explore Community Section */}
        <section className="flex flex-col gap-8 mb-12">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-white">Explore Community Interviews</h2>
            {hasUpcomingInterviews && (
              <span className="text-sm text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-600/30 font-medium">
                {allInterview.length} Available
              </span>
            )}
          </div>

          <div className="interviews-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasUpcomingInterviews ? (
              allInterview.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  userId={user?.id ?? ""}
                  interviewId={interview.id}
                  role={interview.role}
                  type={interview.type}
                  techstack={interview.techstack}
                  createdAt={
                    typeof interview.createdAt === "string"
                      ? interview.createdAt
                      : interview.createdAt?.toISOString()
                  }
                />
              ))
            ) : (
              <div className="col-span-full text-center py-16 bg-zinc-900/40 backdrop-blur-sm rounded-xl border border-zinc-800/60">
                <p className="text-xl text-zinc-400 font-semibold mb-2">No public interviews yet</p>
                <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                  Be the first to share one, or check back later as more users publish their mock interviews.
                </p>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-cyan-500/60 hover:bg-cyan-500/10 hover:text-cyan-200"
                >
                  <Link href="/interview">Create Yours</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Optional footer if you want */}
      <footer className="py-6 text-center text-sm text-zinc-500 border-t border-zinc-800">
        © {new Date().getFullYear()} SonicPrep AI. Mock interviews that feel real.
      </footer>
    </div>
  );
}

export default Home;