"use client";

import Image from "next/image";
import {
  startTransition,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { getVapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import {
  beginInterviewGeneration,
  createFeedback,
  hasGeneratedInterviewSince,
  saveInterviewAttempt,
} from "@/lib/actions/general.action";
import { companyOptions, getCompanyLogo } from "@/lib/company";
interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "practice";
  questions?: string[];
}

interface Message {
  type: string;
  transcriptType: string;
  role: "user" | "assistant" | "system";
  transcript: string;
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

function completedTranscript(messages: SavedMessage[]) {
  return messages.length
    ? messages
    : [
        {
          role: "system" as const,
          content:
            "The interview session completed without a final transcript.",
        },
      ];
}

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}
const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const vapi = getVapi();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [company, setCompany] = useState("");
  const [avatar, setAvatar] = useState<"male" | "female">("male");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingGeneration, setSavingGeneration] = useState(false);
  const [generationSaveUnconfirmed, setGenerationSaveUnconfirmed] =
    useState(false);
  const [attemptSaveStatus, setAttemptSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const feedbackStarted = useRef(false);
  const generationStartedAt = useRef<number | null>(null);

  const saveAttempt = useCallback(async () => {
    if (type !== "practice" || !interviewId || !userId) return;
    setAttemptSaveStatus("saving");
    try {
      const result = await saveInterviewAttempt({ interviewId, userId });
      setAttemptSaveStatus(result.success ? "saved" : "error");
    } catch (error) {
      console.error("Interview save error:", error);
      setAttemptSaveStatus("error");
    }
  }, [interviewId, type, userId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    if (!vapi) return;
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      setError(null);
      startTransition(() => void saveAttempt());
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
      if (type === "generate") setSavingGeneration(true);
    };

    const onMessage = (message: Message) => {
      const content = message.transcript?.trim();
      if (
        message.type === "transcript" &&
        message.transcriptType === "final" &&
        content
      ) {
        const newMessage: SavedMessage = {
          role: message.role === "user" ? "user" : "assistant",
          content: content.slice(0, 8000),
        };
        setMessages((previous) => {
          const last = previous[previous.length - 1];
          return last?.role === newMessage.role &&
            last.content === newMessage.content
            ? previous
            : [...previous, newMessage];
        });
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);

    const onError = (error: unknown) => {
      console.error("Vapi Error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Connection error occurred. Please try again.",
      );
      setCallStatus(CallStatus.ERROR);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
      vapi.stop();
    };
  }, [saveAttempt, type, vapi]);
  const handleGenerateFeedback = useCallback(
    async (msgs: SavedMessage[]) => {
      if (!interviewId || !userId) return;
      setSavingFeedback(true);
      setError(null);
      try {
        const {
          success,
          feedbackId: id,
          attemptSaved,
        } = await createFeedback({
          interviewId,
          userId,
          transcript: msgs,
          feedbackId,
        });
        if (attemptSaved) setAttemptSaveStatus("saved");

        if (success && id) {
          router.push(`/interview/${interviewId}/feedback`);
        } else {
          setError(
            "Feedback is unavailable right now. Your interview record is saved if the save indicator shows Saved. Please try again.",
          );
        }
      } catch (err) {
        console.error("Feedback error:", err);
        setError("Feedback is unavailable right now. Please try again.");
      } finally {
        setSavingFeedback(false);
      }
    },
    [feedbackId, interviewId, router, userId],
  );
  useEffect(() => {
    if (callStatus === CallStatus.FINISHED && !feedbackStarted.current) {
      if (type === "generate") {
        let cancelled = false;
        const confirmSave = async () => {
          if (!generationStartedAt.current || !userId) {
            setGenerationSaveUnconfirmed(true);
            setError(
              "Interview saving could not be confirmed. Please try again.",
            );
            setCallStatus(CallStatus.ERROR);
            setSavingGeneration(false);
            return;
          }
          for (let attempt = 0; attempt < 15; attempt++) {
            try {
              const saved = await hasGeneratedInterviewSince({
                userId,
                since: generationStartedAt.current,
              });
              if (cancelled) return;
              if (saved) {
                router.replace("/");
                return;
              }
            } catch (error) {
              console.error("Interview save check failed:", error);
            }
            await new Promise((resolve) => setTimeout(resolve, 1500));
            if (cancelled) return;
          }
          setError(
            "We could not confirm that your interview was saved. Please check Your Interviews before trying again.",
          );
          setGenerationSaveUnconfirmed(true);
          setCallStatus(CallStatus.ERROR);
          setSavingGeneration(false);
        };
        void confirmSave();
        return () => {
          cancelled = true;
        };
      } else if (interviewId && userId) {
        const timeout = setTimeout(() => {
          if (feedbackStarted.current) return;
          feedbackStarted.current = true;
          startTransition(
            () => void handleGenerateFeedback(completedTranscript(messages)),
          );
        }, 1500);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          router.push("/");
        }, 1500);
        return () => clearTimeout(timeout);
      }
    }
  }, [
    messages,
    callStatus,
    handleGenerateFeedback,
    interviewId,
    router,
    type,
    userId,
  ]);
  const handleCall = useCallback(async () => {
    feedbackStarted.current = false;
    setAttemptSaveStatus("idle");
    setSavingGeneration(false);
    setGenerationSaveUnconfirmed(false);
    setCallStatus(CallStatus.CONNECTING);
    setMessages([]);
    setError(null);

    try {
      if (!vapi)
        throw new Error(
          "Voice practice is not configured. Please contact the site owner.",
        );
      if (type === "generate") {
        const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
        if (!workflowId)
          throw new Error(
            "Interview generation is not configured. Please contact the site owner.",
          );
        if (!userId) throw new Error("Please sign in again before starting.");
        generationStartedAt.current = await beginInterviewGeneration(
          userId,
          company,
        );
        if (!generationStartedAt.current)
          throw new Error("Please sign in again before starting.");
        await vapi.start(workflowId, {
          variableValues: { username: userName, userid: userId, company },
        });
      } else {
        const formattedQuestions =
          questions?.map((q) => `- ${q}`).join("\n") || "";
        await vapi.start(interviewer, {
          variableValues: { questions: formattedQuestions },
        });
      }
    } catch (err: unknown) {
      setCallStatus(CallStatus.ERROR);
      setError(err instanceof Error ? err.message : "Failed to start call");
    }
  }, [type, userName, userId, questions, vapi, company]);

  const handleDisconnect = useCallback(() => vapi?.stop(), [vapi]);
  const handleRetry = useCallback(() => {
    setCallStatus(CallStatus.INACTIVE);
    setError(null);
    setMessages([]);
  }, []);

  return (
    <div className="flex flex-col items-center w-full gap-6 py-6 px-2 sm:px-4 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl sm:text-4xl font-semibold text-violet-700 dark:text-primary-200">
          {type === "generate" ? "Create an interview" : "Interview practice"}
        </h1>
        <div
          className={cn(
            "px-6 py-3 rounded-full text-lg font-semibold",
            callStatus === CallStatus.ACTIVE
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40"
              : callStatus === CallStatus.ERROR
                ? "bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/40"
                : callStatus === CallStatus.CONNECTING
                  ? "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border border-yellow-500/40"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600/50",
          )}
        >
          {callStatus === CallStatus.CONNECTING
            ? "Connecting..."
            : callStatus === CallStatus.ACTIVE
              ? isSpeaking
                ? "AI Speaking..."
                : "Your turn"
              : callStatus === CallStatus.ERROR
                ? "Interview needs attention"
                : callStatus === CallStatus.FINISHED
                  ? savingGeneration
                    ? "Saving interview..."
                    : savingFeedback
                      ? "Preparing feedback..."
                      : "Interview finished"
                  : "Ready"}
        </div>
      </div>
      {callStatus === CallStatus.INACTIVE && (
        <fieldset className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
          <legend className="px-2 text-sm font-semibold">
            Choose your avatar
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(["male", "female"] as const).map((choice) => (
              <label
                key={choice}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-2 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-violet-400",
                  avatar === choice
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-border hover:bg-accent",
                )}
              >
                <input
                  type="radio"
                  name="candidate-avatar"
                  value={choice}
                  checked={avatar === choice}
                  onChange={() => setAvatar(choice)}
                  className="sr-only"
                />
                <Image
                  src={
                    choice === "female"
                      ? "/candidate-avatar-female.webp"
                      : "/candidate-avatar-male.webp"
                  }
                  alt=""
                  width={48}
                  height={48}
                  className={cn(
                    "size-12 rounded-full object-cover",
                    choice === "female" && "-scale-x-100",
                  )}
                />
                {choice === "female" ? "Female" : "Male"}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-8 items-start justify-center max-w-2xl w-full min-w-0">
        <div className="flex min-w-0 flex-col items-center gap-3 p-3 sm:p-8 bg-white/90 dark:bg-zinc-900/60 rounded-3xl border border-purple-500/30 shadow-lg">
          <div className="relative w-20 h-20 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-purple-500/40">
            <Image
              src="/ai-interviewer.webp"
              alt="AI Interviewer"
              width={144}
              height={144}
              className="object-cover w-full h-full"
              priority
            />
            {isSpeaking && (
              <div className="absolute inset-0 bg-cyan-400/30 animate-pulse rounded-3xl" />
            )}
          </div>
          <h3 className="text-base sm:text-2xl font-bold text-foreground dark:text-white">
            Sonic AI
          </h3>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-3 p-3 sm:p-8 bg-white/90 dark:bg-zinc-900/60 rounded-3xl border border-cyan-500/30 shadow-lg">
          <div className="w-20 h-20 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-cyan-500/40">
            <Image
              src={
                avatar === "female"
                  ? "/candidate-avatar-female.webp"
                  : "/candidate-avatar-male.webp"
              }
              alt={`${avatar === "female" ? "Female" : "Male"} candidate avatar`}
              width={144}
              height={144}
              className={cn(
                "object-cover w-full h-full",
                avatar === "female" && "-scale-x-100",
              )}
              priority
            />
          </div>
          <h3 className="max-w-full truncate text-base sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {userName}
          </h3>
        </div>
      </div>
      {messages.length > 0 && (
        <section
          aria-label="Interview conversation"
          className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-lg shadow-violet-950/5"
        >
          <header className="flex items-center justify-between border-b border-border bg-violet-500/5 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground dark:text-white">
                Interview conversation
              </h2>
              <p className="text-xs text-muted-foreground">
                Final answers are saved with your interview feedback.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
              Live
            </span>
          </header>
          <div
            aria-live="polite"
            className="flex h-[min(46svh,25rem)] flex-col gap-2 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#eef2ff,transparent_55%)] p-3 dark:bg-[radial-gradient(circle_at_top,#1f163b,transparent_55%)] sm:p-4"
          >
            {messages.map((msg, index) => {
              const isCandidate = msg.role === "user";
              const isSystem = msg.role === "system";
              return (
                <article
                  key={`${msg.role}-${index}-${msg.content.slice(0, 24)}`}
                  className={cn(
                    "max-w-[88%] break-words rounded-2xl px-3 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[76%]",
                    isCandidate
                      ? "self-end rounded-br-md bg-violet-700 text-white"
                      : isSystem
                        ? "self-center rounded-xl bg-zinc-200/80 text-center text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        : "self-start rounded-bl-md border border-border bg-white text-foreground dark:bg-zinc-900 dark:text-white",
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {!isSystem && (
                    <p
                      className={cn(
                        "mt-1 text-[11px] font-medium",
                        isCandidate
                          ? "text-violet-100"
                          : "text-muted-foreground",
                      )}
                    >
                      {isCandidate ? "You" : "Sonic AI"}
                    </p>
                  )}
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </section>
      )}
      <div className="flex flex-col items-center gap-6 w-full max-w-md pb-20">
        {type === "generate" && callStatus === CallStatus.INACTIVE && (
          <label className="w-full text-sm font-medium text-foreground">
            Company (optional)
            <select
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground"
            >
              <option value="">Choose a company</option>
              {companyOptions.map((option) => (
                <option
                  key={option}
                  value={option[0].toUpperCase() + option.slice(1)}
                />
              ))}
            </select>
            <span className="mt-2 block text-xs font-normal text-muted-foreground">
              {company && getCompanyLogo(company)
                ? "The matching company logo will appear on the saved interview."
                : "Choose a company to show its logo on your saved interview."}
            </span>
            {company && getCompanyLogo(company) && (
              <span className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm font-medium text-foreground">
                <Image
                  src={getCompanyLogo(company)!}
                  alt={`${company} logo`}
                  width={32}
                  height={32}
                  className="size-8 rounded-lg object-contain"
                />
                {company} interview selected
              </span>
            )}
          </label>
        )}
        {type === "practice" && attemptSaveStatus !== "idle" && (
          <div
            role={attemptSaveStatus === "error" ? "alert" : "status"}
            className={cn(
              "w-full rounded-xl border px-4 py-3 text-center text-sm",
              attemptSaveStatus === "error"
                ? "border-red-400/30 bg-red-400/10 text-red-800 dark:text-red-200"
                : "border-emerald-400/20 bg-emerald-400/5 text-emerald-800 dark:text-emerald-200",
            )}
          >
            {attemptSaveStatus === "saving"
              ? "Saving your interview..."
              : attemptSaveStatus === "saved"
                ? "Interview saved to Your Interviews."
                : "Your interview could not be saved yet."}
            {attemptSaveStatus === "error" && (
              <button
                type="button"
                onClick={() => void saveAttempt()}
                className="ml-2 underline underline-offset-4"
              >
                Retry save
              </button>
            )}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="w-full rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-800 dark:text-red-200"
          >
            {error}
            <button
              disabled={savingFeedback}
              onClick={() => {
                if (generationSaveUnconfirmed) router.push("/");
                else if (callStatus === CallStatus.FINISHED)
                  startTransition(
                    () =>
                      void handleGenerateFeedback(
                        completedTranscript(messages),
                      ),
                  );
                else handleRetry();
              }}
              className="mt-2 block min-h-11 underline"
            >
              {generationSaveUnconfirmed
                ? "Check Your Interviews"
                : "Try again"}
            </button>
          </div>
        )}
        {callStatus === CallStatus.ACTIVE ? (
          <button
            onClick={handleDisconnect}
            className="w-full px-12 py-6 bg-red-700 hover:bg-red-600 text-white font-bold rounded-3xl shadow-2xl transition-all"
          >
            🛑 End Interview
          </button>
        ) : (
          <button
            onClick={handleCall}
            disabled={
              callStatus === CallStatus.CONNECTING ||
              (callStatus === CallStatus.FINISHED &&
                (type === "generate" || messages.length > 0))
            }
            className="w-full px-12 py-6 bg-gradient-to-r from-purple-700 to-blue-700 text-white font-bold rounded-3xl shadow-2xl disabled:opacity-50"
          >
            {callStatus === CallStatus.CONNECTING
              ? "Connecting..."
              : callStatus === CallStatus.FINISHED
                ? savingGeneration
                  ? "Saving interview..."
                  : savingFeedback
                    ? "Preparing feedback..."
                    : "Interview finished"
                : "🎙️ Start Interview"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Agent;
