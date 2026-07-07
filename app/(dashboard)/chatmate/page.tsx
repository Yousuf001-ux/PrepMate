"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChatmateWelcome } from "@/components/chatmate/ChatmateWelcome";
import { ChatmateStudyPlanFlow } from "@/components/chatmate/ChatmateStudyPlanFlow";
import { ChatmateSummarizeFlow } from "@/components/chatmate/ChatmateSummarizeFlow";
import { ChatmateQuizFlow } from "@/components/chatmate/ChatmateQuizFlow";
import { SummaryView } from "@/components/chatmate/SummaryView";

type ChatmateStep = "WELCOME" | "STUDY_PLAN" | "SUMMARIZE_TOPIC" | "GENERATE_QUIZ" | "VIEW_SUMMARY";

export default function ChatmatePage() {
  const searchParams = useSearchParams();
  const summaryId = searchParams.get("summaryId");
  const quizId = searchParams.get("quiz");
  const flow = searchParams.get("flow");
  const [step, setStep] = useState<ChatmateStep>(() => {
    if (summaryId) return "VIEW_SUMMARY";
    if (quizId) return "GENERATE_QUIZ";
    if (flow === "study_plan") return "STUDY_PLAN";
    if (flow === "quiz") return "GENERATE_QUIZ";
    return "WELCOME";
  });

  useEffect(() => {
    if (summaryId) {
      setStep("VIEW_SUMMARY");
    } else if (quizId) {
      setStep("GENERATE_QUIZ");
    } else if (flow === "study_plan") {
      setStep("STUDY_PLAN");
    } else if (flow === "quiz") {
      setStep("GENERATE_QUIZ");
    } else {
      setStep("WELCOME");
    }
  }, [summaryId, quizId, flow]);

  return (
    <div className="flex-1 flex flex-col items-center w-full h-full">
      {step === "WELCOME" && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-sm:min-h-[100dvh] max-w-3xl mx-auto">
          <ChatmateWelcome onSelectGoal={setStep} />
        </div>
      )}
      {step === "STUDY_PLAN" && (
        <div className="flex-1 flex flex-col w-full">
          <ChatmateStudyPlanFlow onBack={() => setStep("WELCOME")} />
        </div>
      )}
      {step === "SUMMARIZE_TOPIC" && (
        <div className="flex-1 flex flex-col w-full">
          <ChatmateSummarizeFlow onBack={() => setStep("WELCOME")} />
        </div>
      )}
      {step === "VIEW_SUMMARY" && summaryId && (
        <div className="flex-1 flex flex-col w-full">
          <SummaryView summaryId={summaryId} onNew={() => setStep("SUMMARIZE_TOPIC")} />
        </div>
      )}
      {step === "GENERATE_QUIZ" && (
        <div className="flex-1 flex flex-col w-full">
          <ChatmateQuizFlow onBack={() => setStep("WELCOME")} quizId={quizId ?? undefined} />
        </div>
      )}
    </div>
  );
}
