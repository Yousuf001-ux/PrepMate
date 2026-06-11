export interface StudyPlanOutput {
  sessions: {
    date: string;
    course: string;
    topic: string;
    durationMinutes: number;
    priority: "high" | "medium" | "low";
  }[];
}

export interface SummaryOutput {
  summary: string;
  keyConcepts: string[];
}

export interface QuizOutput {
  questions: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

export interface RescheduleOutput {
  sessions: {
    date: string;
    course: string;
    topic: string;
    durationMinutes: number;
    priority: "high" | "medium" | "low";
  }[];
}
