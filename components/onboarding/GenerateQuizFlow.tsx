"use client";

import { useState } from "react";
import { ArrowLeft, Plus, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberCounter } from "@/components/onboarding/NumberCounter";
import { completeOnboarding } from "@/actions/onboarding";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface GenerateQuizFlowProps {
  onBack: () => void;
}

export function GenerateQuizFlow({ onBack }: GenerateQuizFlowProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

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

    setIsProcessing(true);
    try {
      const result = await completeOnboarding({
        flow: "GENERATE_QUIZ",
        data: {
          topic: topic || (file ? `Generate a quiz about the content of ${file.name}` : "Unknown topic"),
          questionCount
        }
      });

      if (result.success && result.data && "quizId" in result.data) {
        // In full app, we might redirect to `/quiz/${result.data.quizId}`. For MVP, we redirect to dashboard.
        // Or if we have a quiz attempting page we can go there. The prompt said "Redirect user to Quiz Experience".
        // If there's no page yet, dashboard is safe.
        router.push("/dashboard"); 
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
          <div className="w-full md:w-[70%] p-2 border border-border bg-surface rounded-2xl flex flex-col items-start gap-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <div className="flex w-full items-center gap-2">
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
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-body-large px-4 h-14"
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

          <div className="w-full md:w-[30%] flex flex-col items-center justify-center gap-2 bg-surface border border-border rounded-2xl p-4">
            <span className="text-label-large text-muted-foreground">Questions</span>
            <NumberCounter value={questionCount} min={5} max={50} onChange={setQuestionCount} />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 bg-background/80 backdrop-blur-md border-t border-border flex justify-center z-10">
          <Button size="lg" className="w-full max-w-sm rounded-full" onClick={handleGenerate}>
            Generate Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}
