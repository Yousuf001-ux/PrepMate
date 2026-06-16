"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Calendar, FileText, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStep } from "@/app/(onboarding)/onboarding/page";
import confetti from "canvas-confetti";

interface WelcomeScreenProps {
  onSelectGoal: (step: OnboardingStep) => void;
}

export function WelcomeScreen({ onSelectGoal }: WelcomeScreenProps) {
  const { data: session, status } = useSession();
  const userName = session?.user?.name || "Student";
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.6 },
        colors: ["#4F6EF7", "#7C93F5", "#A5B4FC"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.6 },
        colors: ["#4F6EF7", "#7C93F5", "#A5B4FC"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  if (status === "loading") return null;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl text-center space-y-12 animate-in fade-in zoom-in duration-500">
      <div className="space-y-0">
        <h1 className="text-display-medium text-foreground font-semibold">
          Welcome, {userName}
        </h1>
        <p className="text-display-medium text-foreground font-semibold text-nowrap">
          How would you like to proceed?
        </p>
      </div>

      <div className="flex flex-row gap-3">
        <Button 
          variant="outline" 
          className="h-14 px-8 text-body-medium rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => onSelectGoal("STUDY_PLAN")}
        >
          <Calendar className="h-5 w-5" />
          Generate Study Plan
        </Button>
        <Button 
          variant="outline" 
          className="h-14 px-8 text-body-medium rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => onSelectGoal("SUMMARIZE_TOPIC")}
        >
          <FileText className="h-5 w-5" />
          Summarize Topic
        </Button>
        <Button 
          variant="outline" 
          className="h-14 px-8 text-body-medium rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => onSelectGoal("GENERATE_QUIZ")}
        >
          <BrainCircuit className="h-5 w-5" />
          Generate Quiz
        </Button>
      </div>
    </div>
  );
}
