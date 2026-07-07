"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStudyPlan } from "@/lib/ai/study-plan";
import { generateSummary } from "@/lib/ai/summarizer";
import { generateQuiz } from "@/lib/ai/quiz";
import { parseFile } from "@/lib/file-parser";

const CourseInputSchema = z.object({
  name: z.string().min(1),
  topics: z.array(z.string().min(1)).min(1),
  examDate: z.string(),
});

const StudyPlanDataSchema = z.object({
  sessionName: z.string().min(1),
  courses: z.array(CourseInputSchema).min(1),
  hoursPerDay: z.number().min(1).max(16),
});

const SummarizeTopicDataSchema = z.object({
  topic: z.string().min(1),
  fileName: z.string().optional(),
  fileBase64: z.string().optional(),
  fileType: z.string().optional(),
});

const GenerateQuizDataSchema = z.object({
  topic: z.string().min(1),
  questionCount: z.number().min(5).max(50),
  fileName: z.string().optional(),
  fileBase64: z.string().optional(),
  fileType: z.string().optional(),
});

export async function chatmateStudyPlan(data: z.infer<typeof StudyPlanDataSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false as const, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const parsed = StudyPlanDataSchema.safeParse(data);
    if (!parsed.success) return { success: false as const, error: "Invalid input" };

    const aiPlan = await generateStudyPlan({
      courses: parsed.data.courses.map(c => ({
        name: c.name,
        examDate: c.examDate,
        topics: c.topics,
        weakTopics: [],
      })),
      availableHoursPerDay: parsed.data.hoursPerDay,
      startDate: new Date().toISOString().split("T")[0],
    });

    const planId = await prisma.$transaction(async (tx) => {
      const dbCourses = await Promise.all(
        parsed.data.courses.map(async (c) => {
          const dbCourse = await tx.course.create({
            data: {
              userId,
              name: c.name,
              examDate: new Date(c.examDate),
              topics: { create: c.topics.map(t => ({ name: t })) },
            },
            include: { topics: true },
          });
          return dbCourse;
        })
      );

      const getTopicId = (courseName: string, topicName: string) => {
        for (const c of dbCourses) {
          if (c.name.toLowerCase() === courseName.toLowerCase()) {
            const t = c.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
            if (t) return t.id;
          }
        }
        return dbCourses[0].topics[0].id;
      };

      const sp = await tx.studyPlan.create({
        data: {
          userId,
          name: parsed.data.sessionName,
          sessions: {
            create: aiPlan.sessions.map(s => ({
              topicId: getTopicId(s.course, s.topic),
              scheduledDate: new Date(s.date),
              durationMinutes: s.durationMinutes,
            })),
          },
        },
      });

      return sp.id;
    });

    return { success: true as const, data: { planId } };
  } catch (error) {
    console.error("[chatmate-study-plan]", error);
    return { success: false as const, error: "Something went wrong while building your study plan. Try again." };
  }
}

export async function chatmateSummarize(topic: string, fileName?: string, fileBase64?: string, fileType?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false as const, error: "Unauthorized" };

  try {
    const parsed = SummarizeTopicDataSchema.safeParse({ topic, fileName, fileBase64, fileType });
    if (!parsed.success) return { success: false as const, error: "Invalid input" };

    let contentToSummarize = parsed.data.topic;

    if (parsed.data.fileBase64 && parsed.data.fileType && parsed.data.fileName) {
      const buffer = Buffer.from(parsed.data.fileBase64, "base64");
      const parsedFile = await parseFile(buffer, parsed.data.fileType, parsed.data.fileName);
      contentToSummarize = parsedFile.text || contentToSummarize;
    }

    const aiSummary = await generateSummary(contentToSummarize);

    const title = parsed.data.fileName
      ? parsed.data.fileName.replace(/\.[^/.]+$/, "").substring(0, 100)
      : parsed.data.topic.substring(0, 100);

    const summary = await prisma.summary.create({
      data: {
        userId: session.user.id,
        title,
        content: {
          explanation: aiSummary.summary,
          keyConcepts: aiSummary.keyConcepts,
        },
      },
    });

    return { success: true as const, data: { id: summary.id, title, explanation: aiSummary.summary, keyConcepts: aiSummary.keyConcepts } };
  } catch (error) {
    console.error("[chatmate-summarize]", error);
    return { success: false as const, error: "Unable to generate summary. Try again." };
  }
}

export async function chatmateQuiz(topic: string, questionCount: number, fileName?: string, fileBase64?: string, fileType?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false as const, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const parsed = GenerateQuizDataSchema.safeParse({ topic, questionCount, fileName, fileBase64, fileType });
    if (!parsed.success) return { success: false as const, error: "Invalid input" };

    let contentToQuiz = parsed.data.topic;

    if (parsed.data.fileBase64 && parsed.data.fileType && parsed.data.fileName) {
      const buffer = Buffer.from(parsed.data.fileBase64, "base64");
      const parsedFile = await parseFile(buffer, parsed.data.fileType, parsed.data.fileName);
      contentToQuiz = parsedFile.text || contentToQuiz;
    }

    const name = parsed.data.fileName
      ? parsed.data.fileName.replace(/\.[^/.]+$/, "").substring(0, 100)
      : parsed.data.topic.substring(0, 100);

    const aiQuiz = await generateQuiz({
      topic: contentToQuiz,
      numQuestions: parsed.data.questionCount,
    });

    const result = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          userId,
          name: "Quick Quizzes",
          examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          topics: { create: [{ name }] },
        },
        include: { topics: true },
      });

      const quiz = await tx.quiz.create({
        data: {
          topicId: course.topics[0].id,
          questions: aiQuiz.questions as any,
        },
      });

      return { quizId: quiz.id, questions: aiQuiz.questions };
    });

    return { success: true as const, data: result };
  } catch (error) {
    console.error("[chatmate-quiz]", error);
    return { success: false as const, error: "Unable to generate quiz. Try again." };
  }
}
