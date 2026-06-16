"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Plus } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function addTopic() {
    setTopics([...topics, ""]);
  }

  function removeTopic(index: number) {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index));
    }
  }

  function updateTopic(index: number, value: string) {
    const updated = [...topics];
    updated[index] = value;
    setTopics(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const filteredTopics = topics.filter((t) => t.trim());

    if (filteredTopics.length === 0) {
      setError("Add at least one topic");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          examDate: new Date(examDate).toISOString(),
          topics: filteredTopics,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create course");
        setLoading(false);
        return;
      }

      router.push("/courses");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-headline-small text-foreground">Add Course</h1>
        <p className="text-body-small text-muted-foreground">
          Set up a course with its exam date and topics
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-title-medium">Course Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Course name *</Label>
              <Input
                id="name"
                placeholder="e.g. Human Anatomy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="examDate">Exam date *</Label>
              <Input
                id="examDate"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-3">
              <Label>Topics *</Label>
              {topics.map((topic, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Topic ${index + 1}`}
                    value={topic}
                    onChange={(e) => updateTopic(index, e.target.value)}
                    required
                  />
                  {topics.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTopic(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTopic}
                className="self-start"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add topic
              </Button>
            </div>

            {error && (
              <p className="text-destructive text-body-small">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create course"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
