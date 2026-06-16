import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, HelpCircle, BarChart3 } from "lucide-react";

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
      <header className="flex items-center justify-end px-6 py-4 sm:px-10">
        <span
          className="text-primary"
          style={{
            fontSize: "var(--font-headline-headline-small-font-size)",
            letterSpacing: "var(--font-headline-headline-medium-letter-spacing)",
            position: "absolute",
            top: 16,
            left: 40,
          }}
        >
          PrepMate AI
        </span>
        <Link href="/register">
          <Button variant="default" className="rounded-full px-5 py-6">Get started</Button>
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center sm:px-10 lg:py-32">
          <h1 className="text-display-large text-foreground w-full whitespace-nowrap">
            Study smarter with AI-powered planning
          </h1>
          <p className="mt-4 max-w-2xl text-body-large text-muted-foreground">
            Personalized study plans, topic summaries, and practice quizzes — all in one place.
          </p>
          <div className="mt-10">
            <Link href="/register">
<Button variant="default" size="lg" className="px-10 py-7 text-body-large rounded-full text-primary-foreground">
                  Start free
                </Button>
            </Link>
          </div>
        </section>


      </main>

      <footer className="px-6 py-6 text-center text-body-small text-muted-foreground sm:px-10">
        <p>&copy; {new Date().getFullYear()} PrepMate AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
