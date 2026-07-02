"use client";

import { Calendar, FileText, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

interface ChatmateWelcomeProps {
  onSelectGoal: (goal: "STUDY_PLAN" | "SUMMARIZE_TOPIC" | "GENERATE_QUIZ") => void;
}

export function ChatmateWelcome({ onSelectGoal }: ChatmateWelcomeProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Student";

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl text-center space-y-12 animate-in fade-in zoom-in duration-500">
      <div className="space-y-0">
        <h1 className="text-headline-large text-foreground font-semibold">
          Welcome back, {userName}
        </h1>
        <p className="text-headline-large text-foreground font-semibold max-sm:text-pretty sm:text-nowrap">
          How would you like to proceed?
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0">
        <Button
          variant="outline"
          className="h-14 px-8 text-body-medium rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all w-full sm:w-auto"
          onClick={() => onSelectGoal("STUDY_PLAN")}
        >
          <Calendar className="h-5 w-5" />
          Generate Study Plan
        </Button>
        <Button
          variant="outline"
          className="h-14 px-8 text-body-medium rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all w-full sm:w-auto"
          onClick={() => onSelectGoal("SUMMARIZE_TOPIC")}
        >
          <FileText className="h-5 w-5" />
          Summarize Topic
        </Button>
        <Button
          variant="outline"
          className="h-14 px-8 text-body-medium rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all w-full sm:w-auto"
          onClick={() => onSelectGoal("GENERATE_QUIZ")}
        >
          <BrainCircuit className="h-5 w-5" />
          Generate Quiz
        </Button>
      </div>
    </div>
  );
}
