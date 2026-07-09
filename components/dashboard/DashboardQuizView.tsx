"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { capitalize } from "@/lib/utils";

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface AttemptData {
  answers: Record<string, string>;
  score: number;
}

interface QuizData {
  quizId: string;
  topic: string;
  questions: Question[];
  attempt?: AttemptData | null;
}

export function DashboardQuizView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quiz");

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    fetch(`/api/quiz/${quizId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          const attempt = data.data.attempt as AttemptData | null;
          setQuizData({
            quizId: data.data.quizId,
            topic: data.data.topic,
            questions: data.data.questions as Question[],
            attempt,
          });
          if (attempt) {
            setSelectedAnswers(
              Object.fromEntries(
                Object.entries(attempt.answers).map(([k, v]) => [Number(k), v])
              )
            );
            setShowResults(true);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load quiz");
        setLoading(false);
      });
  }, [quizId]);

  if (!quizId) return null;

  const totalQuestions = quizData?.questions.length ?? 0;
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectAnswer = (questionIndex: number, option: string) => {
    if (showResults) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: option }));
  };

  const handleNext = () => {
    if (currentQuestion === totalQuestions - 1) {
      if (quizId) {
        fetch(`/api/quiz/${quizId}/attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: selectedAnswers }),
        }).catch(() => {});
      }
      setShowResults(true);
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    router.push("/chatmate?flow=quiz");
  };

  const handleEndQuiz = () => {
    router.push("/chatmate");
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
        <div className="w-full">
          <div className="w-full pt-8 pb-4">
            <div className="mx-auto w-full max-w-[80%] max-sm:max-w-full flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/30 rounded-full" style={{ width: "10%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quizData) return null;

  if (showResults) {
    const correctCount = quizData.questions.filter(
      (q, i) => selectedAnswers[i] === q.correctAnswer
    ).length;

    return (
      <>
        <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
          <div className="w-full">
            <div className="w-full pt-8 pb-4">
              <div className="mx-auto w-full max-w-[80%] max-sm:max-w-full flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-foreground font-medium truncate" style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
                    {capitalize(quizData.topic)}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-palette-tertiary-60 text-white font-semibold text-label-medium px-5 h-10 flex items-center">
                      {correctCount}/{totalQuestions} correct
                    </span>
                    <button onClick={handleReset} className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      <Plus className="size-4" />
                      New Quiz
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-label-medium text-muted-foreground whitespace-nowrap tabular-nums">
                    {totalQuestions}/{totalQuestions}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[80%] max-sm:max-w-full space-y-6">
            <div className="flex flex-col gap-6">
              {quizData.questions.map((q, i) => {
                const isCorrect = selectedAnswers[i] === q.correctAnswer;
                const isWrong = selectedAnswers[i] && selectedAnswers[i] !== q.correctAnswer;

                return (
                  <Card key={i} className={`border ${isCorrect ? "border-green-500/50" : isWrong ? "border-red-500/50" : ""}`}>
                    <CardHeader>
                      <CardTitle className="flex items-start gap-2 text-title-medium">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label-small text-primary">
                          {i + 1}
                        </span>
                        {q.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {q.options.map((opt, j) => {
                          const isCorrectOpt = opt === q.correctAnswer;
                          const isWrongOpt = selectedAnswers[i] === opt && opt !== q.correctAnswer;
                          let optClass = "rounded-lg border border-muted-foreground/10 px-3 py-2.5 text-body-small text-left";

                          if (isCorrectOpt) optClass += " border-green-500 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400";
                          else if (isWrongOpt) optClass += " border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400";

                          return (
                            <div key={j} className={optClass}>
                              <span className="flex items-center gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[0.65rem] font-medium">
                                  {String.fromCharCode(65 + j)}
                                </span>
                                {opt}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-body-small text-muted-foreground border-t border-muted-foreground/10 pt-3">
                        <span className="font-medium text-foreground">Explanation:</span> {q.explanation}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
        <button onClick={handleReset} className="md:hidden fixed top-4 right-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground transition-colors cursor-pointer z-[60] rounded-lg px-3 py-2">
          <Plus className="size-4" />
          New Quiz
        </button>
      </>
    );
  }

  const q = quizData.questions[currentQuestion];
  const selected = selectedAnswers[currentQuestion];
  const progressPercent = ((currentQuestion + 1) / totalQuestions) * 100;

  return (
    <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
      <div className="w-full">
        <div className="w-full pt-8 pb-4">
          <div className="mx-auto w-full max-w-[80%] max-sm:max-w-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-medium truncate" style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
                {capitalize(quizData.topic)}
              </h2>
              <Button variant="ghost" className="!text-destructive bg-destructive/10 hover:bg-destructive/25 font-medium text-label-large" onClick={handleEndQuiz}>
                End Quiz
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-label-medium text-muted-foreground whitespace-nowrap tabular-nums">
                {currentQuestion + 1}/{totalQuestions}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[80%] max-sm:max-w-full max-sm:space-y-4 sm:space-y-10 max-sm:mt-4 sm:mt-10">
        <div className="w-full mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-start gap-3 leading-relaxed" style={{ fontSize: "1.25rem" }}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label-small text-primary mt-0.5">
                  {currentQuestion + 1}
                </span>
                {q.question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {q.options.map((opt, j) => {
                  const isSelected = selected === opt;
                  let optClass = "rounded-xl border px-4 py-3.5 text-body-medium text-left transition-all cursor-pointer hover:bg-muted";

                  if (isSelected) {
                    optClass += " border-primary bg-primary/5 ring-1 ring-primary";
                  } else {
                    optClass += " border-muted-foreground/10 hover:border-muted-foreground/30";
                  }

                  return (
                    <button
                      key={j}
                      onClick={() => handleSelectAnswer(currentQuestion, opt)}
                      className={optClass}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-label-small font-medium">
                          {String.fromCharCode(65 + j)}
                        </span>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="tertiary"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="rounded-full px-8 h-12 min-w-32"
          >
            Previous
          </Button>
          <Button
            size="lg"
            className="rounded-full px-8 h-12 min-w-32"
            onClick={handleNext}
            disabled={selected === undefined}
          >
            {currentQuestion === totalQuestions - 1 ? "Show Results" : "Next"}
          </Button>
        </div>
        <button onClick={handleReset} className="md:hidden fixed top-4 right-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground transition-colors cursor-pointer z-[60] rounded-lg px-3 py-2">
          <Plus className="size-4" />
          New Quiz
        </button>
      </div>
    </div>
  );
}
