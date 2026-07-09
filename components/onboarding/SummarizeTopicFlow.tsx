"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Send, FileText, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/actions/onboarding";
import { prepareFileData } from "@/lib/client-pdf";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface SummarizeTopicFlowProps {
  onBack: () => void;
}

export function SummarizeTopicFlow({ onBack }: SummarizeTopicFlowProps) {
  const router = useRouter();
  const { update } = useSession();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg"];
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Unsupported file format.");
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast.error("File is too large. Maximum size is 10 MB.");
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
      const { fileBase64, fileType, extractedText } = await prepareFileData(file);

      const result = await completeOnboarding({
        flow: "SUMMARIZE_TOPIC",
        data: {
          topic: extractedText || topic || (file ? `Summarize the content of ${file.name}` : "Unknown topic"),
          fileName: file?.name,
          fileBase64,
          fileType,
        }
      });

      if (result.success) {
        const data = result.data as { id: string; title: string; explanation: string; keyConcepts: string[] };
        window.dispatchEvent(new Event("history-updated"));
        await update({ onboardingCompleted: true });
        router.push(`/chatmate?summaryId=${data.id}`);
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

  if (isProcessing) {
    return (
      <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
        <div className="w-full max-w-2xl mt-32">
          <p className="text-body-medium text-muted-foreground animate-pulse">Generating your summary...</p>
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

      <div className="flex flex-col items-center w-full max-w-2xl space-y-8">
        <h2 className="text-headline-large text-foreground font-medium text-center">
          Summarize a topic
        </h2>
        
        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full p-2 border border-muted-foreground/20 bg-muted/30 dark:bg-input/30 rounded-full flex flex-row items-center gap-0 focus-within:ring-3 focus-within:ring-ring/50 transition-all">
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
              className="cursor-pointer h-12 w-12 flex items-center justify-center hover:bg-muted/20 text-muted-foreground rounded-xl transition-colors"
            >
              <Plus className="h-6 w-6" />
            </Label>
          </div>
          
          <Input 
            autoFocus
            className="flex-1 border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-0 text-body-medium sm:text-body-large pl-0 pr-4 h-14 truncate"
            placeholder={isMobile ? "What do you want summarized?" : "What topic do you want summarized?"}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <Button size="icon" className="rounded-full h-12 w-12 ml-auto shrink-0" onClick={handleGenerate} disabled={isProcessing || (!topic.trim() && !file)}>
            {isProcessing ? (
              <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>

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
