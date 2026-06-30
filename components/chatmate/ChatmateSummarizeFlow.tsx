"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, FileText, X, Copy, Check, WandSparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chatmateSummarize } from "@/actions/chatmate-tools";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface ChatmateSummarizeFlowProps {
  onBack: () => void;
}

export function ChatmateSummarizeFlow({ onBack }: ChatmateSummarizeFlowProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isSimplified, setIsSimplified] = useState(false);
  const [simplifiedExplanation, setSimplifiedExplanation] = useState<string | null>(null);
  const [simplifying, setSimplifying] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const result = await chatmateSummarize(
        topic || (file ? `Summarize the content of ${file.name}` : "Unknown topic")
      );

      if (result.success) {
        setSummary(result.data);
        window.dispatchEvent(new Event("history-updated"));
        router.replace(`/chatmate?summaryId=${result.data.id}`);
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

  async function handleSimplify() {
    if (simplifiedExplanation) {
      setIsSimplified(!isSimplified);
      return;
    }

    setSimplifying(true);
    try {
      const res = await fetch("/api/summarizer/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explanation: summary.explanation }),
      });
      const data = await res.json();
      if (data.data?.simplified) {
        setSimplifiedExplanation(data.data.simplified);
        setIsSimplified(true);
      }
    } catch {
      // silently fail
    } finally {
      setSimplifying(false);
    }
  }

  async function handleCopy() {
    const text = isSimplified && simplifiedExplanation ? simplifiedExplanation : summary?.explanation;
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (summary) {
    const explanation = isSimplified && simplifiedExplanation ? simplifiedExplanation : summary.explanation;
    return (
      <div className="w-full h-full overflow-y-auto flex flex-col">
        <div className="w-full max-w-2xl mx-auto mt-24 pb-6">
          <p className="text-body-medium text-muted-foreground">Here&apos;s a summary of {summary.title}</p>
          <Card className="w-full border border-border/20 mt-4">
          <CardContent className="pt-2 px-14 pb-6 space-y-6">
          <div className="flex items-center justify-end gap-4 -mr-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleSimplify}
                      disabled={simplifying}
                      className={`cursor-pointer transition-colors ${isSimplified ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {simplifying ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                    </button>
                  }
                />
                <TooltipContent>
                  {simplifying ? "Simplifying..." : isSimplified ? "Standard explanation" : "Simpler explanation"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
            </button>
          </div>
          <div>
            <h3 className="text-title-large text-foreground font-medium mb-2">Simplified Explanation</h3>
            <div className="space-y-4">
              {explanation.split("\n\n").map((paragraph: string, idx: number) => (
                <p
                  key={idx}
                  className="text-body-medium text-muted-foreground whitespace-pre-wrap"
                >
                  {paragraph}
                </p>
              ))}
            </div>
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
        </div>
        <button
          onClick={() => { setSummary(null); setTopic(""); setFile(null); router.replace("/chatmate"); }}
          className="fixed top-8 right-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-50"
        >
          <Plus className="size-4" />
          New summary
        </button>
      </div>
    );
  }

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

        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full p-2 border border-muted-foreground/20 bg-surface rounded-full flex flex-row items-center gap-0 focus-within:ring-3 focus-within:ring-ring/50 transition-all">
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
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-body-medium sm:text-body-large pl-0 pr-4 h-14 truncate"
            placeholder={isMobile ? "What do you want summarized?" : "What topic do you want summarized?"}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <Button size="icon" className="rounded-full h-12 w-12 ml-auto shrink-0" onClick={handleGenerate} disabled={isProcessing || (!topic.trim() && !file)}>
            <Send className="h-5 w-5" />
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
