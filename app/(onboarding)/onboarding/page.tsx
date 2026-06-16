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
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center">
      {step === "WELCOME" && <WelcomeScreen onSelectGoal={setStep} />}
      {step === "STUDY_PLAN" && <StudyPlanFlow onBack={() => setStep("WELCOME")} />}
      {step === "SUMMARIZE_TOPIC" && <SummarizeTopicFlow onBack={() => setStep("WELCOME")} />}
      {step === "GENERATE_QUIZ" && <GenerateQuizFlow onBack={() => setStep("WELCOME")} />}
    </div>
  );
}
