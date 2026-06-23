"use client";

import { useState } from "react";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { StudyPlanFlow } from "@/components/onboarding/StudyPlanFlow";
import { SummarizeTopicFlow } from "@/components/onboarding/SummarizeTopicFlow";
import { GenerateQuizFlow } from "@/components/onboarding/GenerateQuizFlow";

export type OnboardingStep = 
  | "WELCOME" 
  | "STUDY_PLAN" 
  | "SUMMARIZE_TOPIC" 
  | "GENERATE_QUIZ";

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("WELCOME");

  return (
    <div className="flex-1 flex flex-col items-center w-full">
      {step === "WELCOME" && (
        <div className="flex-1 flex items-center justify-center w-full max-sm:min-h-[100dvh] max-w-3xl mx-auto">
          <WelcomeScreen onSelectGoal={setStep} />
        </div>
      )}
      {step === "STUDY_PLAN" && (
        <div className="flex-1 flex flex-col w-full">
          <StudyPlanFlow onBack={() => setStep("WELCOME")} />
        </div>
      )}
      {step === "SUMMARIZE_TOPIC" && (
        <div className="flex-1 flex flex-col w-full">
          <SummarizeTopicFlow onBack={() => setStep("WELCOME")} />
        </div>
      )}
      {step === "GENERATE_QUIZ" && (
        <div className="flex-1 flex flex-col w-full">
          <GenerateQuizFlow onBack={() => setStep("WELCOME")} />
        </div>
      )}
    </div>
  );
}
