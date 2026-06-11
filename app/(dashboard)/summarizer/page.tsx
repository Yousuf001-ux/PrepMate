"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";

export default function SummarizerPage() {
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-headline-small text-foreground">Topic Summarizer</h1>
        <p className="text-body-small text-muted-foreground">
          Get AI-powered summaries of complex topics
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic" className="text-label-medium text-foreground">
            What topic do you want summarized?
          </label>
          <Textarea
            id="topic"
            placeholder="e.g. Photosynthesis, Newton's Laws of Motion, The Krebs Cycle..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            rows={3}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={loading || !topic.trim()}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Summarizing...
            </>
          ) : (
            "Summarize"
          )}
        </Button>
      </form>

      {summary && (
        <Card>
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
  );
}
