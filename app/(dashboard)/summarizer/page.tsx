"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText, Loader2, Send } from "lucide-react";

export default function SummarizerPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSummary("");
    setLoading(true);

    try {
      const res = await fetch("/api/summarizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate summary");
        setLoading(false);
        return;
      }

      setSummary(data.data.summary);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col h-full w-full animate-in fade-in duration-300">
      <div className="absolute top-4 left-4 z-50">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        <h2 className="text-headline-large text-foreground font-medium text-center">
          Summarize a topic
        </h2>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pb-6 space-y-4">
        <form onSubmit={handleSubmit} className="w-full p-2 border border-muted-foreground/20 bg-surface rounded-full flex flex-row items-center gap-0 focus-within:ring-3 focus-within:ring-ring/50 transition-all">
          <div className="relative">
            <input
              ref={fileInputRef}
              id="file-upload"
              className="hidden"
              accept=".pdf,.docx,.txt,image/png,image/jpeg"
              type="file"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer h-12 w-12 flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors"
            >
              <Plus className="h-6 w-6" />
            </label>
          </div>

          <Input
            placeholder={isMobile ? "What do you want summarized?" : "What topic do you want summarized?"}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-body-medium sm:text-body-large pl-0 pr-4 h-14 truncate"
          />

          <Button
            type="submit"
            size="icon"
            disabled={loading || !topic.trim()}
            className="rounded-full h-12 w-12 ml-auto shrink-0"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>

        {error && <p className="text-destructive text-body-small w-full text-center">{error}</p>}

        {summary && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-title-medium">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body-medium text-foreground whitespace-pre-line">
                {summary}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
