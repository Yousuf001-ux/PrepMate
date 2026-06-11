"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

export default function GeneratePlanPage() {
  const router = useRouter();
  const [hoursPerDay, setHoursPerDay] = useState("4");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const hours = parseFloat(hoursPerDay);
    if (isNaN(hours) || hours < 1 || hours > 16) {
      setError("Enter a value between 1 and 16 hours");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableHoursPerDay: hours }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate study plan");
        setLoading(false);
        return;
      }

      router.push("/study-plan");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-headline-small text-foreground">Generate Study Plan</h1>
        <p className="text-body-small text-muted-foreground">
          Let AI create a personalized study schedule
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-medium">Your Availability</CardTitle>
          <CardDescription className="text-body-small">
            How many hours can you study per day?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hours">Hours per day</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                max={16}
                step={0.5}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                required
                className="w-32"
              />
              <p className="text-body-small text-muted-foreground">
                Be realistic — consistency beats intensity
              </p>
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="self-start">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Plan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
