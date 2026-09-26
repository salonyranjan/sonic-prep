"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
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
import BrandLogo from "@/components/BrandLogo";
import { companyOptions } from "@/lib/company";
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
  const transcriptMissing = useRef(false);
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
      void saveAttempt();
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
      if (type === "generate") setSavingGeneration(true);
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage: SavedMessage = {
          role: message.role,
          content: message.transcript,
        };
        setMessages((prev) => [...prev, newMessage]);
        if (message.role === "user" && transcriptMissing.current) {
          transcriptMissing.current = false;
          setCallStatus(CallStatus.FINISHED);
        }
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);

    const onError = (error: unknown) => {
      transcriptMissing.current = false;
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
          for (let attempt = 0; attempt < 40; attempt++) {
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
      } else if (messages.some((message) => message.role === "user")) {
        if (interviewId && userId) {
          const timeout = setTimeout(() => {
            if (feedbackStarted.current) return;
            feedbackStarted.current = true;
            void handleGenerateFeedback(messages);
          }, 1500);
          return () => clearTimeout(timeout);
        } else {
          router.push("/");
        }
      } else {
        const timeout = setTimeout(() => {
          transcriptMissing.current = true;
          setError(
            "No answer transcript was received, so feedback is unavailable. You can try the interview again.",
          );
          setCallStatus(CallStatus.ERROR);
        }, 5000);
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
    transcriptMissing.current = false;
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
    transcriptMissing.current = false;
    setCallStatus(CallStatus.INACTIVE);
    setError(null);
    setMessages([]);
  }, []);

  return (
    <div className="flex flex-col items-center w-full gap-8 py-10 px-2 sm:px-4 bg-background">
      <div className="text-center space-y-4">
        <h1 className="flex items-center justify-center gap-3 text-3xl sm:text-4xl font-semibold text-violet-700 dark:text-primary-200">
          <BrandLogo size={40} className="shrink-0 rounded-xl" />
          SonicPrep AI Interview
        </h1>
        <div
          className={cn(
            "px-6 py-3 rounded-full text-lg font-semibold",
            callStatus === CallStatus.ACTIVE
              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40"
              : callStatus === CallStatus.ERROR
                ? "bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/40"
                : callStatus === CallStatus.CONNECTING
                  ? "bg-yellow-500/20 text-amber-900 dark:text-yellow-300 border border-yellow-500/40"
                  : "bg-zinc-200/70 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600/50",
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
      <div className="flex flex-col sm:flex-row gap-12 items-center justify-center max-w-4xl w-full">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white/90 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden shadow-2xl border-4 border-purple-500/40">
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
          <h3 className="text-2xl font-bold text-foreground dark:text-white">
            Sonic AI
          </h3>
        </div>

        <div className="flex flex-col items-center space-y-4 p-8 bg-white/90 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-cyan-500/30 shadow-2xl">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-cyan-500/40">
            <Image
              src="/candidate-avatar.webp"
              alt="User profile"
              width={144}
              height={144}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-800 to-blue-800 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
            {userName}
          </h3>
        </div>
      </div>
      {messages.length > 0 && (
        <div className="w-full max-w-3xl">
          <div className="p-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-3xl border border-purple-500/40">
            <div className="bg-white/95 dark:bg-zinc-950/95 p-8 rounded-3xl max-h-80 overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-6 rounded-2xl",
                    msg.role === "user"
                      ? "bg-cyan-500/20 ml-auto max-w-lg"
                      : "bg-purple-500/20",
                  )}
                >
                  <span className="text-xs font-bold opacity-50 mb-2 block">
                    {msg.role.toUpperCase()}
                  </span>
                  <p className="text-foreground dark:text-white text-lg">
                    {msg.content}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-6 w-full max-w-md pb-20">
        {type === "generate" && callStatus === CallStatus.INACTIVE && (
          <label className="w-full text-sm font-medium text-foreground">
            Company (optional)
            <input
              list="company-options"
              value={company}
              maxLength={80}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="e.g. Amazon"
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground"
            />
            <datalist id="company-options">
              {companyOptions.map((option) => (
                <option
                  key={option}
                  value={option[0].toUpperCase() + option.slice(1)}
                />
              ))}
            </datalist>
            <span className="mt-2 block text-xs font-normal text-muted-foreground">
              Listed companies show their official logo. Other names show their
              initials.
            </span>
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
                else if (
                  callStatus === CallStatus.FINISHED &&
                  messages.some((message) => message.role === "user")
                )
                  void handleGenerateFeedback(messages);
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
