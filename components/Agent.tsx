"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { getVapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const feedbackStarted = useRef(false);

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
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage: SavedMessage = {
          role: message.role,
          content: message.transcript,
        };
        setMessages((prev) => [...prev, newMessage]);
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
  }, [vapi]);
  const handleGenerateFeedback = useCallback(
    async (msgs: SavedMessage[]) => {
      if (!interviewId || !userId) return;
      setSavingFeedback(true);
      setError(null);
      try {
        const { success, feedbackId: id } = await createFeedback({
          interviewId,
          userId,
          transcript: msgs,
          feedbackId,
        });

        if (success && id) {
          router.push(`/interview/${interviewId}/feedback`);
        } else {
          setError(
            "We couldn't save your feedback. Your transcript is still here; please try again.",
          );
        }
      } catch (err) {
        console.error("Feedback error:", err);
        setError(
          "We couldn't save your feedback. Your transcript is still here; please try again.",
        );
      } finally {
        setSavingFeedback(false);
      }
    },
    [feedbackId, interviewId, router, userId],
  );
  useEffect(() => {
    if (callStatus === CallStatus.FINISHED && !feedbackStarted.current) {
      if (type === "generate") {
        const timeout = setTimeout(() => router.push("/"), 1000);
        return () => clearTimeout(timeout);
      } else if (messages.length > 0) {
        if (interviewId && userId) {
          feedbackStarted.current = true;
          handleGenerateFeedback(messages);
        } else {
          router.push("/");
        }
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
        await vapi.start(workflowId, {
          variableValues: { username: userName, userid: userId },
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
  }, [type, userName, userId, questions, vapi]);

  const handleDisconnect = useCallback(() => vapi?.stop(), [vapi]);
  const handleRetry = useCallback(() => {
    setCallStatus(CallStatus.INACTIVE);
    setError(null);
    setMessages([]);
  }, []);

  return (
    <div className="flex flex-col items-center w-full gap-8 py-10 px-2 sm:px-4 bg-zinc-950">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold text-primary-200">
          SonicPrep AI Interview
        </h1>
        <div
          className={cn(
            "px-6 py-3 rounded-full text-lg font-semibold",
            callStatus === CallStatus.ACTIVE
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : callStatus === CallStatus.ERROR
                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                : callStatus === CallStatus.CONNECTING
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                  : "bg-zinc-700/50 text-zinc-300 border border-zinc-600/50",
          )}
        >
          {callStatus === CallStatus.CONNECTING
            ? "Connecting..."
            : callStatus === CallStatus.ACTIVE
              ? isSpeaking
                ? "AI Speaking..."
                : "Your turn"
              : callStatus === CallStatus.ERROR
                ? "Connection Failed"
                : callStatus === CallStatus.FINISHED
                  ? savingFeedback
                    ? "Preparing feedback..."
                    : "Interview finished"
                  : "Ready"}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-12 items-center justify-center max-w-4xl w-full">
        <div className="flex flex-col items-center space-y-4 p-8 bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl">
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
          <h3 className="text-2xl font-bold text-white">Sonic AI</h3>
        </div>

        <div className="flex flex-col items-center space-y-4 p-8 bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-cyan-500/30 shadow-2xl">
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
          <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {userName}
          </h3>
        </div>
      </div>
      {messages.length > 0 && (
        <div className="w-full max-w-3xl">
          <div className="p-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-3xl border border-purple-500/40">
            <div className="bg-zinc-950/95 p-8 rounded-3xl max-h-80 overflow-y-auto space-y-4">
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
                  <p className="text-white text-lg">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-6 w-full max-w-md pb-20">
        {error && (
          <div
            role="alert"
            className="w-full rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"
          >
            {error}
            <button
              disabled={savingFeedback}
              onClick={() =>
                callStatus === CallStatus.FINISHED
                  ? handleGenerateFeedback(messages)
                  : handleRetry()
              }
              className="mt-2 block min-h-11 underline"
            >
              Try again
            </button>
          </div>
        )}
        {callStatus === CallStatus.ACTIVE ? (
          <button
            onClick={handleDisconnect}
            className="w-full px-12 py-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-3xl shadow-2xl transition-all"
          >
            🛑 End Interview
          </button>
        ) : (
          <button
            onClick={handleCall}
            disabled={
              callStatus === CallStatus.CONNECTING ||
              (callStatus === CallStatus.FINISHED && messages.length > 0)
            }
            className="w-full px-12 py-6 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-3xl shadow-2xl disabled:opacity-50"
          >
            {callStatus === CallStatus.CONNECTING
              ? "Connecting..."
              : callStatus === CallStatus.FINISHED && messages.length > 0
                ? savingFeedback
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
