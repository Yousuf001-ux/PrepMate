"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Copy, Check, WandSparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface SummaryViewProps {
  summaryId: string;
  onNew: () => void;
}

export function SummaryView({ summaryId, onNew }: SummaryViewProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSimplified, setIsSimplified] = useState(false);
  const [simplifiedExplanation, setSimplifiedExplanation] = useState<string | null>(null);
  const [simplifying, setSimplifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/summarizer?summaryId=${summaryId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setSummary(data.data);
        else setError(data.error ?? "Summary not found");
      })
      .catch(() => setError("Failed to load summary"))
      .finally(() => setLoading(false));
  }, [summaryId]);

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

  const explanation = isSimplified && simplifiedExplanation ? simplifiedExplanation : summary?.explanation;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-body-medium text-destructive">{error || "Summary not found"}</p>
      </div>
    );
  }

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
        onClick={onNew}
        className="fixed top-8 right-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-50"
      >
        <Plus className="size-4" />
        New summary
      </button>
    </div>
  );
}
