import type { RouteParams } from "@/types";
import { redirect } from "next/navigation";

import Agent from "@/components/Agent";
import BrandLogo from "@/components/BrandLogo";
import Image from "next/image";
import { getCompanyLogo } from "@/lib/company";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import DisplayTechIcons from "@/components/DisplayTechIcons";

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
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center max-sm:flex-col">
          <div className="flex flex-row gap-4 items-center">
            {getCompanyLogo(interview.company) ? (
              <Image
                src={getCompanyLogo(interview.company)!}
                alt={`${interview.company} logo`}
                width={40}
                height={40}
                className="size-10 rounded-xl object-contain"
              />
            ) : (
              <BrandLogo size={40} className="rounded-xl" />
            )}
            <h3 className="capitalize">{interview.role} Interview</h3>
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

        <p className="bg-slate-100 dark:bg-dark-200 px-4 py-2 rounded-lg h-fit">
          {interview.type}
        </p>
      </div>

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
