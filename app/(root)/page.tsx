import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

async function Home() {
  const user = await getCurrentUser();

  const [userInterviews, allInterview] = await Promise.all([
    getInterviewsByUserId(user?.id!),
    getLatestInterviews({ userId: user?.id! }),
  ]);

  const hasPastInterviews = userInterviews?.length! > 0;
  const hasUpcomingInterviews = allInterview?.length! > 0;

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Banner Section */}
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Master Your Next Interview with Sonic-Speed AI Feedback
          </h2>
          <p className="text-lg opacity-90">
            Practice real-time voice interviews and get instant technical and behavioral analysis.
          </p>

          <Button asChild className="btn-primary max-sm:w-full font-semibold">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>

       <Image
  src="/robot1.png"
  alt="SonicPrep AI Assistant"
  width={300}
  height={300}
  priority
  className="max-sm:hidden w-auto h-auto object-contain transition-all duration-500 hover:scale-[1.02] hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]"
/>
      </section>

      {/* User's History Section */}
      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">Your Interviews</h2>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews?.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p className="text-muted-foreground italic">You haven&apos;t taken any interviews yet. Start one above!</p>
          )}
        </div>
      </section>

      {/* Community/Explore Section */}
      <section className="flex flex-col gap-6 mb-10">
        <h2 className="text-2xl font-bold">Explore Community Interviews</h2>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            allInterview?.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p className="text-muted-foreground italic">No public interviews available right now.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;