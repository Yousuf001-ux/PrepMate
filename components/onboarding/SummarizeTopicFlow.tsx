"use client";

import { useState } from "react";
import { ArrowLeft, Upload, FileText, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/actions/onboarding";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

interface SummarizeTopicFlowProps {
  onBack: () => void;
}

export function SummarizeTopicFlow({ onBack }: SummarizeTopicFlowProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null); // Ideally typed from API response

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
      // In MVP, we would extract text from the file client-side or just pass the topic description.
      // For now we'll pass the topic string to the server action.
      const result = await completeOnboarding({
        flow: "SUMMARIZE_TOPIC",
        data: {
          topic: topic || (file ? `Summarize the content of ${file.name}` : "Unknown topic")
        }
      });

      if (result.success) {
        setSummary(result.data); // Store the summary result to display
      } else {
        toast.error(result.error || "Failed to generate summary");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  const handleContinueToDashboard = () => {
    router.push("/dashboard");
  };

  if (summary) {
    return (
      <div className="w-full flex flex-col items-center animate-in fade-in duration-300 space-y-8 pb-24">
        <h2 className="text-headline-large text-foreground font-medium text-center">
          Your Summary
        </h2>
        <Card className="w-full bg-surface shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-title-large text-foreground font-medium mb-2">Simplified Explanation</h3>
              <p className="text-body-medium text-muted-foreground whitespace-pre-wrap">{summary.explanation}</p>
            </div>
            {summary.keyConcepts && summary.keyConcepts.length > 0 && (
              <div>
                <h3 className="text-title-large text-foreground font-medium mb-2">Key Concepts</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.keyConcepts.map((concept: string, idx: number) => (
                    <li key={idx} className="text-body-medium text-muted-foreground">{concept}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="fixed bottom-0 left-0 w-full p-4 bg-background/80 backdrop-blur-md border-t border-border flex justify-center z-10 gap-4">
          <Button variant="outline" size="lg" className="rounded-full" onClick={() => setSummary(null)}>
            Regenerate
          </Button>
          <Button size="lg" className="rounded-full" onClick={handleContinueToDashboard}>
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-headline-small text-foreground">Generating your summary...</h2>
        <p className="text-body-medium text-muted-foreground">AI is reading and simplifying the topic.</p>
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

      <div className="flex flex-col items-center w-full max-w-2xl space-y-8">
        <h2 className="text-headline-large text-foreground font-medium text-center">
          Summarize Topic
        </h2>
        
        <div className="w-full p-2 border border-border bg-surface rounded-2xl flex flex-col sm:flex-row items-center gap-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
            placeholder="What topic do you want summarized?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <Button size="lg" className="rounded-xl h-12 px-6 ml-auto w-full sm:w-auto" onClick={handleGenerate}>
            Generate Summary
          </Button>
        </div>

        {file && (
          <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 text-primary rounded-xl w-full">
            <FileText className="h-5 w-5" />
            <span className="text-body-medium flex-1 truncate">{file.name}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => setFile(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
