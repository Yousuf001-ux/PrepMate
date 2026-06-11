import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, BookOpen, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const courseCount = await prisma.course.count({
    where: { userId: session.user.id },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingSessions = await prisma.studySession.count({
    where: {
      studyPlan: { userId: session.user.id },
      scheduledDate: { gte: today },
      status: "pending",
    },
  });

  const completedSessions = await prisma.studySession.count({
    where: {
      studyPlan: { userId: session.user.id },
      status: "complete",
    },
  });

  const stats = [
    {
      label: "Courses",
      value: courseCount,
      icon: BookOpen,
      color: "text-primary",
    },
    {
      label: "Upcoming Sessions",
      value: upcomingSessions,
      icon: CalendarDays,
      color: "text-warning",
    },
    {
      label: "Completed",
      value: completedSessions,
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      label: "On Track",
      value: `${courseCount > 0 ? "Yes" : "N/A"}`,
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-headline-small text-foreground">Dashboard</h1>
        <p className="text-body-small text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-label-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-headline-medium text-foreground">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-medium">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-body-small text-muted-foreground">
          {courseCount === 0 ? (
            <>
              <p>Add your first course to get started with AI-powered study planning.</p>
              <p className="text-primary">
                Go to Courses → Add Course
              </p>
            </>
          ) : upcomingSessions === 0 ? (
            <>
              <p>You have courses set up. Generate a study plan to see your sessions here.</p>
              <p className="text-primary">
                Go to Study Plan → Generate Plan
              </p>
            </>
          ) : (
            <p>You&apos;re all set! Review your upcoming sessions in the Study Plan.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
