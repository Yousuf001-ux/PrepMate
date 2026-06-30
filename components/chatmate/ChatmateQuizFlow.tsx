"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, FileText, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chatmateQuiz } from "@/actions/chatmate-tools";
import { toast } from "sonner";

interface ChatmateQuizFlowProps {
  onBack: () => void;
}

export function ChatmateQuizFlow({ onBack }: ChatmateQuizFlowProps) {
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

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
        toast.success("Quiz generated successfully!");
        setIsProcessing(false);
        onBack();
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

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-headline-small text-foreground">Generating your quiz...</h2>
        <p className="text-body-medium text-muted-foreground">AI is crafting {questionCount} questions to test your knowledge.</p>
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
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-body-large pl-0 pr-4 h-14 truncate"
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

        <div className="flex justify-center">
          <Button size="lg" className="rounded-full px-8 h-14" onClick={handleGenerate}>
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
          <span className={`flex-1 text-left text-[0.875rem] pl-2 truncate ${value === "" ? "text-muted-foreground/50" : "text-foreground"}`}>
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
