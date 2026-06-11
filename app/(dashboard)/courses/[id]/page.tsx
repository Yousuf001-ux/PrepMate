import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;

  const course = await prisma.course.findFirst({
    where: { id, userId: session.user.id },
    include: { topics: true },
  });

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2 text-body-small text-muted-foreground mb-1">
          <Link href="/courses" className="hover:text-foreground">
            Courses
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-headline-small text-foreground">{course.name}</h1>
        <p className="flex items-center gap-2 text-body-small text-muted-foreground mt-1">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Exam:{" "}
          {new Date(course.examDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-title-medium text-foreground">
          Topics ({course.topics.length})
        </h2>

        {course.topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-12">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-body-small text-muted-foreground">
              No topics added yet
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {course.topics.map((topic) => (
              <Card key={topic.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-title-medium">
                      {topic.name}
                    </CardTitle>
                    <CardDescription className="text-body-small mt-1">
                      Priority: {topic.priority}
                    </CardDescription>
                  </div>
                  {topic.isWeak && (
                    <Badge variant="destructive">Weak</Badge>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
