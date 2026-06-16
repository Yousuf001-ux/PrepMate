"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HelpCircle, Loader2 } from "lucide-react";

export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState("5");
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setQuestions([]);
    setLoading(true);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, numQuestions: parseInt(numQuestions) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate quiz");
        setLoading(false);
        return;
      }

      setQuestions(data.data.questions ?? []);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-headline-small text-foreground">Quiz Generator</h1>
        <p className="text-body-small text-muted-foreground">
          Test your knowledge with AI-generated quizzes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quiz-topic" className="text-label-medium text-foreground">
            Topic
          </label>
          <Input
            id="quiz-topic"
            placeholder="e.g. World War II, Cell Biology..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="numQuestions" className="text-label-medium text-foreground">
            Number of questions
          </label>
          <Select value={numQuestions} onValueChange={(v) => v && setNumQuestions(v)}>
            <SelectTrigger id="numQuestions" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 5, 10].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-destructive text-body-small">{error}</p>}

        <Button type="submit" disabled={loading || !topic.trim()}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Quiz"
          )}
        </Button>
      </form>

      {questions.length > 0 && (
        <div className="flex flex-col gap-4">
          {questions.map((q: any, i: number) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-start gap-2 text-title-medium">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label-small text-primary">
                    {i + 1}
                  </span>
                  {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {q.options?.map((opt: string, j: number) => (
                    <li
                      key={j}
                      className="rounded-lg border border-border px-3 py-2 text-body-small"
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
