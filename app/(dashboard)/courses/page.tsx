import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const courses = await prisma.course.findMany({
    where: { userId: session.user.id },
    include: { topics: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-small text-foreground">Courses</h1>
          <p className="text-body-small text-muted-foreground">
            Manage your courses and topics
          </p>
        </div>
        <Link href="/courses/new">
          <Button variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <p className="text-title-medium text-foreground">No courses yet</p>
          <p className="text-body-small text-muted-foreground">
            Add your first course to start building your study plan.
          </p>
          <Link href="/courses/new">
            <Button variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-title-medium">
                    {course.name}
                  </CardTitle>
                  <CardDescription className="text-body-small">
                    {course.topics.length} topic{course.topics.length !== 1 ? "s" : ""}
                    {" · "}
                    {new Date(course.examDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
