import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, FileText, HelpCircle, BarChart3 } from "lucide-react";

const features = [
  {
    title: "AI Study Plans",
    description: "Generate personalized study schedules that adapt to your courses, exam dates, and available time.",
    icon: Calendar,
  },
  {
    title: "Topic Summaries",
    description: "Get concise AI-powered summaries of complex topics to accelerate your understanding.",
    icon: FileText,
  },
  {
    title: "Practice Quizzes",
    description: "Test your knowledge with AI-generated quizzes tailored to each topic.",
    icon: HelpCircle,
  },
  {
    title: "Progress Tracking",
    description: "Monitor your study consistency and see how you're tracking toward your goals.",
    icon: BarChart3,
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-title-medium text-foreground">PrepMate</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-label-large text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link href="/register">
            <Button variant="default">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center sm:px-10 lg:py-32">
          <h1 className="text-display-small sm:text-display-medium text-foreground max-w-3xl">
            Study smarter with AI-powered planning
          </h1>
          <p className="mt-6 max-w-2xl text-body-large text-muted-foreground">
            PrepMate creates personalized study schedules, summarizes topics, generates quizzes,
            and tracks your progress so you can focus on what matters most.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/register">
              <Button variant="default" size="lg">
                Start free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-title-medium text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-body-small text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-body-small text-muted-foreground sm:px-10">
        <p>&copy; {new Date().getFullYear()} PrepMate AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
