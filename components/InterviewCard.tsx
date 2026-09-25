import type { InterviewCardProps } from "@/types";
import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";

import { Button } from "./ui/button";
import DisplayTechIcons from "./DisplayTechIcons";
import BrandLogo from "./BrandLogo";
import { getCompanyLogo } from "@/lib/company";

import { cn } from "@/lib/utils";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";

const InterviewCard = async ({
  interviewId,
  userId,
  role,
  type,
  techstack,
  createdAt,
  attempted,
  company,
}: InterviewCardProps) => {
  let feedback = null;
  if (userId && interviewId) {
    try {
      feedback = await getFeedbackByInterviewId({ interviewId, userId });
    } catch (error) {
      console.error("Interview feedback could not load:", error);
    }
  }

  const normalizedType = /mix/i.test(type)
    ? "Mixed"
    : /behav/i.test(type)
      ? "Behavioral"
      : "Technical";

  const badgeColor = {
    Behavioral:
      "border-cyan-400/30 bg-cyan-400/10 text-cyan-800 dark:text-cyan-200",
    Mixed:
      "border-violet-400/30 bg-violet-400/10 text-violet-800 dark:text-violet-200",
    Technical:
      "border-indigo-400/30 bg-indigo-400/10 text-indigo-800 dark:text-indigo-200",
  }[normalizedType];

  const date = feedback?.createdAt || createdAt;
  const formattedDate =
    date && dayjs(date).isValid()
      ? dayjs(date).format("MMM D, YYYY")
      : "Date unavailable";

  return (
    <div className="card-border !w-full min-w-0 min-h-96 transition-transform duration-200 hover:-translate-y-1 focus-within:-translate-y-1">
      <div className="card-interview border border-border">
        <div>
          <div
            className={cn(
              "absolute top-5 right-5 rounded-full border px-3 py-1 text-xs font-semibold",
              badgeColor,
            )}
          >
            {normalizedType}
          </div>
          <div className="flex size-[76px] items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-cyan-500/10 shadow-lg shadow-violet-950/20">
            {getCompanyLogo(company) ? (
              <Image
                src={getCompanyLogo(company)!}
                alt={`${company} logo`}
                width={52}
                height={52}
                className="size-[52px] rounded-[14px] object-contain"
              />
            ) : company ? (
              <span
                className="text-2xl font-bold text-foreground"
                aria-label={company}
              >
                {company.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <BrandLogo size={52} className="rounded-[14px]" />
            )}
          </div>
          {company && (
            <p className="mt-4 text-sm font-semibold text-violet-700 dark:text-primary-200">
              {company}
            </p>
          )}
          <h3 className="mt-5 line-clamp-2 capitalize text-foreground">
            {role} Interview
          </h3>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Image
                src="/calendar.svg"
                width={22}
                height={22}
                alt=""
                className="size-[22px] shrink-0"
              />
              <p>{formattedDate}</p>
            </div>

            <div className="flex flex-row gap-2 items-center">
              <Image src="/star.svg" width={22} height={22} alt="" />
              <p>{feedback?.totalScore ?? "---"}/100</p>
            </div>
          </div>
          <p className="line-clamp-2 mt-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {feedback?.finalAssessment ||
              (attempted
                ? "Your interview was saved. Feedback is not available yet; you can retake it anytime."
                : "You haven't taken this interview yet. Take it now to improve your skills.")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <DisplayTechIcons techStack={techstack} />

          <Button asChild className="btn-primary">
            <Link
              href={
                feedback
                  ? `/interview/${interviewId}/feedback`
                  : `/interview/${interviewId}`
              }
            >
              {feedback
                ? "Check Feedback"
                : attempted
                  ? "Retake Interview"
                  : "View Interview"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
