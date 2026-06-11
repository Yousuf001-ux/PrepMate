import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";

export default async function ProgressPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const totalSessions = await prisma.studySession.count({
    where: { studyPlan: { userId: session.user.id } },
  });

  const completedSessions = await prisma.studySession.count({
    where: {
      studyPlan: { userId: session.user.id },
      status: "complete",
    },
  });

  const completionRate = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-headline-small text-foreground">Progress</h1>
        <p className="text-body-small text-muted-foreground">
          Track your study consistency
        </p>
      </div>

      {totalSessions === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16">
          <BarChart3 className="h-10 w-10 text-muted-foreground" />
          <p className="text-title-medium text-foreground">No data yet</p>
          <p className="text-body-small text-muted-foreground">
            Start studying to see your progress here.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-title-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-body-small">
              <span className="text-muted-foreground">
                {completedSessions} of {totalSessions} sessions completed
              </span>
              <span className="text-foreground font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
