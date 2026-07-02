"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, FileText, X, ChevronDown, Check, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { chatmateQuiz } from "@/actions/chatmate-tools";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizData {
  quizId: string;
  questions: Question[];
}

interface ChatmateQuizFlowProps {
  onBack: () => void;
}

export function ChatmateQuizFlow({ onBack }: ChatmateQuizFlowProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg"];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Unsupported file format.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() && !file) {
      toast.error("Please provide a topic description or upload a file.");
      return;
    }
    if (typeof questionCount !== "number") {
      toast.error("Please select the number of questions.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await chatmateQuiz(
        topic || (file ? `Generate a quiz about the content of ${file.name}` : "Unknown topic"),
        typeof questionCount === "number" ? questionCount : 10
      );

      if (result.success && result.data) {
        setQuizData({ quizId: result.data.quizId, questions: result.data.questions as Question[] });
        setSelectedAnswers({});
        setShowResults(false);
        setCurrentQuestion(0);
        setIsProcessing(false);
        router.replace(`/chatmate?flow=quiz&quiz=${result.data.quizId}`, { scroll: false });
        window.dispatchEvent(new CustomEvent("history-updated"));
      } else {
        toast.error(result.error || "Failed to generate quiz");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  const handleSelectAnswer = (questionIndex: number, option: string) => {
    if (showResults) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: option }));
  };

  const handleShowResults = () => {
    if (quizData?.quizId) {
      fetch(`/api/quiz/${quizData.quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: selectedAnswers }),
      }).catch(() => {});
    }
    setShowResults(true);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setQuizData(null);
    setSelectedAnswers({});
    setShowResults(false);
    router.replace("/chatmate?flow=quiz", { scroll: false });
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = quizData?.questions.length ?? 0;
  const correctCount = showResults
    ? quizData?.questions.filter((q, i) => selectedAnswers[i] === q.correctAnswer).length ?? 0
    : 0;

  const quizLoadingMessages = [
    "Generating your quiz...",
    "Crafting your questions...",
    "Preparing answer options...",
    "Writing explanations...",
    "Finalizing your quiz...",
  ];
  const [quizLoadingIndex, setQuizLoadingIndex] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setQuizLoadingIndex((i) => (i + 1) % quizLoadingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (quizData) {
    const q = quizData.questions[currentQuestion];
    const selected = selectedAnswers[currentQuestion];
    const isLastQuestion = currentQuestion === totalQuestions - 1;

    const handleNext = () => {
      if (isLastQuestion) {
        handleShowResults();
      } else {
        setCurrentQuestion((prev) => prev + 1);
      }
    };

    if (showResults) {
      return (
        <>
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <div className="w-full">
              <div className="w-full pt-8 pb-4">
                <div className="mx-auto w-full max-w-[80%] max-sm:max-w-full flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-foreground font-medium truncate" style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
                      {topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : "Quiz"}
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
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: "100%" }}
                      />
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

                            if (isCorrectOpt) {
                              optClass += " border-green-500 bg-green-50 text-green-800";
                            } else if (isWrongOpt) {
                              optClass += " border-red-500 bg-red-50 text-red-800";
                            }

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

    const progressPercent = ((currentQuestion + 1) / totalQuestions) * 100;

    return (
      <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
        <div className="w-full">
          <div className="w-full pt-8 pb-4">
            <div className="mx-auto w-full max-w-[80%] max-sm:max-w-full flex flex-col gap-4">
              <div className="flex items-center justify-between">
                  <h2 className="text-foreground font-medium truncate" style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
                    {topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : "Quiz"}
                  </h2>
                  <Button variant="ghost" className="!text-destructive bg-destructive/10 hover:bg-destructive/25 font-medium text-label-large" onClick={onBack}>
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
              {isLastQuestion ? "Show Results" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
        <div className="w-full max-w-3xl pt-12">
          <p className="text-label-large text-muted-foreground animate-pulse">{quizLoadingMessages[quizLoadingIndex]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
      <div className="w-full self-start mb-12">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex flex-col items-center w-full max-w-3xl space-y-8">
        <h2 className="text-headline-large text-foreground font-medium text-center">
          Generate Quiz
        </h2>

        <div className="w-full flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-[70%] p-2 border border-muted-foreground/20 bg-surface rounded-full flex flex-col items-start gap-0 focus-within:ring-3 focus-within:ring-ring/50 transition-all">
            <div className="flex w-full items-center gap-0">
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.docx,.txt,image/png,image/jpeg"
                  onChange={handleFileChange}
                />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer h-12 w-12 flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors"
                >
                  <Plus className="h-6 w-6" />
                </Label>
              </div>

              <Input
                autoFocus
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-body-large max-sm:text-base pl-0 pr-4 h-14 truncate"
                placeholder="What topic should the quiz be about?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 px-4 py-3 ml-2 mb-2 bg-primary/5 text-primary rounded-xl w-[calc(100%-16px)]">
                <FileText className="h-5 w-5" />
                <span className="text-body-medium flex-1 truncate">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <QuestionCountDropdown
            value={questionCount}
            onChange={setQuestionCount}
            open={selectOpen}
            onOpenChange={setSelectOpen}
          />
        </div>

        <div className="flex justify-center w-full px-4 sm:px-0">
          <Button size="lg" className="rounded-full px-8 h-14 w-full sm:w-auto" onClick={handleGenerate}>
            Generate Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

const options = [5, 10, 15, 20, 25, 30];

interface QuestionCountDropdownProps {
  value: number | "";
  onChange: (value: number | "") => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function QuestionCountDropdown({ value, onChange, open, onOpenChange }: QuestionCountDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const selectedValue = value === "" ? null : value;

  return (
    <div ref={containerRef} className="relative w-full md:w-[30%]">
      <div className="p-2 border border-muted-foreground/20 bg-surface rounded-full focus-within:ring-3 focus-within:ring-ring/50 transition-all">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenChange(!open);
            }
            if (e.key === "ArrowDown" && open) {
              e.preventDefault();
              setFocusIndex((prev) => Math.min(prev + 1, options.length - 1));
            }
            if (e.key === "ArrowUp" && open) {
              e.preventDefault();
              setFocusIndex((prev) => Math.max(prev - 1, 0));
            }
            if (e.key === "Escape" && open) {
              onOpenChange(false);
            }
          }}
          className="w-full h-14 rounded-full border-none bg-transparent flex items-center gap-2 focus-visible:outline-none transition-all"
        >
          <span className={`flex-1 text-left text-[0.875rem] max-sm:text-base pl-2 truncate ${value === "" ? "text-muted-foreground/50" : "text-foreground"}`}>
            {value === "" ? "Number of questions" : value}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 mr-1 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-popover text-popover-foreground rounded-xl border border-muted-foreground/20 shadow-none p-1.5 origin-top animate-in fade-in-0 zoom-in-95 transition-all duration-150"
          role="listbox"
        >
          {options.map((n, i) => (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={selectedValue === n}
              onClick={() => {
                onChange(n);
                onOpenChange(false);
              }}
              onMouseEnter={() => setFocusIndex(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-medium transition-colors ${
                selectedValue === n
                  ? "bg-primary/10 text-primary"
                  : focusIndex === i
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex-1 text-left">{n}</span>
              {selectedValue === n && (
                <Check className="h-4 w-4 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
