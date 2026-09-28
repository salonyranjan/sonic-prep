import type { RouteParams } from "@/types";
import { redirect } from "next/navigation";

import Agent from "@/components/Agent";
import Image from "next/image";
import { getCompanyLogo } from "@/lib/company";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import { Button } from "@/components/ui/button";

export const maxDuration = 60;

const InterviewDetails = async ({ params }: RouteParams) => {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-wrap gap-3 items-center">
            {getCompanyLogo(interview.company) ? (
              <Image
                src={getCompanyLogo(interview.company)!}
                alt={`${interview.company} logo`}
                width={40}
                height={40}
                className="size-10 rounded-xl object-contain"
              />
            ) : interview.company ? (
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold"
                aria-label={interview.company}
              >
                {interview.company.slice(0, 2).toUpperCase()}
              </span>
            ) : null}
            <h3 className="min-w-0 capitalize">{interview.role} Interview</h3>
            {interview.company && (
              <span className="text-sm text-muted-foreground">
                at {interview.company}
              </span>
            )}
          </div>

          <DisplayTechIcons
            techStack={
              Array.isArray(interview.techstack) ? interview.techstack : []
            }
          />
        </div>

        <p className="w-fit bg-dark-200 px-4 py-2 rounded-lg h-fit">
          {interview.type}
        </p>
      </div>

      {feedback && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground dark:text-white">
              Your interview report is ready
            </p>
            <p className="text-sm text-muted-foreground">
              Download a professional PDF with your score, improvement plan,
              technical focus, and mind map.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 bg-violet-700 text-white hover:bg-violet-600"
          >
            <a href={`/interview/${id}/feedback/report`} download>
              Download PDF report
            </a>
          </Button>
        </div>
      )}

      <Agent
        userName={user.name}
        userId={user?.id}
        interviewId={id}
        type="practice"
        questions={interview.questions}
        feedbackId={feedback?.id}
      />
    </>
  );
};

export default InterviewDetails;
