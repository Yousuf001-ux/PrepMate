import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sparkles } from "lucide-react";
import Link from "next/link";

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  complete: "secondary",
  missed: "destructive",
};

export default async function StudyPlanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const plan = await prisma.studyPlan.findFirst({
    where: { userId: session.user.id },
    include: {
      sessions: {
        include: { topic: true },
        orderBy: { scheduledDate: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const hasCourses = (await prisma.course.count({
    where: { userId: session.user.id },
  })) > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-small text-foreground">Study Plan</h1>
          <p className="text-body-small text-muted-foreground">
            Your AI-generated study schedule
          </p>
        </div>
        {hasCourses && (
          <Link href="/study-plan/generate">
            <Button variant="default">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Plan
            </Button>
          </Link>
        )}
      </div>

      {!plan || plan.sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16">
          <Calendar className="h-10 w-10 text-muted-foreground" />
          <p className="text-title-medium text-foreground">No study plan yet</p>
          <p className="text-body-small text-muted-foreground">
            {hasCourses
              ? "Generate a study plan to see your schedule."
              : "Add courses first, then generate a plan."}
          </p>
          {hasCourses ? (
            <Link href="/study-plan/generate">
              <Button variant="default">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Plan
              </Button>
            </Link>
          ) : (
            <Link href="/courses">
              <Button variant="default">Add Courses</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plan.sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-title-medium">
                    {session.topic.name}
                  </CardTitle>
                  <CardDescription className="text-body-small">
                    {new Date(session.scheduledDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {session.durationMinutes} min
                  </CardDescription>
                </div>
                <Badge variant={statusColor[session.status] ?? "outline"}>
                  {session.status}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
