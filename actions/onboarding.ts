"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStudyPlan } from "@/lib/ai/study-plan";
import { generateSummary } from "@/lib/ai/summarizer";
import { generateQuiz } from "@/lib/ai/quiz";
import { parseFile } from "@/lib/file-parser";
import { sendWelcomeEmail } from "@/lib/email";

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

type OnboardingInput = 
  | { flow: "STUDY_PLAN"; data: z.infer<typeof StudyPlanDataSchema> }
  | { flow: "SUMMARIZE_TOPIC"; data: z.infer<typeof SummarizeTopicDataSchema> }
  | { flow: "GENERATE_QUIZ"; data: z.infer<typeof GenerateQuizDataSchema> };

export async function completeOnboarding(input: OnboardingInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" };
  }
  const userId = session.user.id;

  try {
    if (input.flow === "STUDY_PLAN") {
      const parsed = StudyPlanDataSchema.safeParse(input.data);
      if (!parsed.success) return { success: false as const, error: "Invalid input" };

      // Generate Study Plan via AI
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

      // Persist in DB
      const planId = await prisma.$transaction(async (tx) => {
        const dbCourses = await Promise.all(
          parsed.data.courses.map(async (c) => {
            const dbCourse = await tx.course.create({
              data: {
                userId,
                name: c.name,
                examDate: new Date(c.examDate),
                topics: {
                  create: c.topics.map(t => ({ name: t }))
                }
              },
              include: { topics: true }
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

        const dbStudyPlan = await tx.studyPlan.create({
          data: {
            userId,
            name: parsed.data.sessionName,
            sessions: {
              create: aiPlan.sessions.map(s => ({
                topicId: getTopicId(s.course, s.topic),
                scheduledDate: new Date(s.date),
                durationMinutes: s.durationMinutes,
              }))
            }
          }
        });

        await tx.user.update({
          where: { id: userId },
          data: { onboardingCompleted: true }
        });

        return dbStudyPlan.id;
      });

      if (session.user.email) {
        sendWelcomeEmail(session.user.email, session.user.name || "there").catch(console.error);
      }

      return { success: true as const, data: { planId } };

    } else if (input.flow === "SUMMARIZE_TOPIC") {
      const parsed = SummarizeTopicDataSchema.safeParse(input.data);
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

      let summaryId = "";
      await prisma.$transaction(async (tx) => {
        const summary = await tx.summary.create({
          data: {
            userId,
            title,
            content: {
              explanation: aiSummary.summary,
              keyConcepts: aiSummary.keyConcepts,
            }
          }
        });
        summaryId = summary.id;

        await tx.user.update({
          where: { id: userId },
          data: { onboardingCompleted: true }
        });
      });

      if (session.user.email) {
        sendWelcomeEmail(session.user.email, session.user.name || "there").catch(console.error);
      }

      return { success: true as const, data: { id: summaryId, title, explanation: aiSummary.summary, keyConcepts: aiSummary.keyConcepts } };

    } else if (input.flow === "GENERATE_QUIZ") {
      const parsed = GenerateQuizDataSchema.safeParse(input.data);
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
        numQuestions: parsed.data.questionCount
      });

      const result = await prisma.$transaction(async (tx) => {
        const course = await tx.course.create({
          data: {
            userId,
            name: "Quick Quizzes",
            examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
            topics: {
              create: [{ name }]
            }
          },
          include: { topics: true }
        });

        const topicId = course.topics[0].id;

        const quiz = await tx.quiz.create({
          data: {
            topicId,
            questions: aiQuiz.questions as any,
          }
        });

        await tx.user.update({
          where: { id: userId },
          data: { onboardingCompleted: true }
        });

        return { quizId: quiz.id };
      });

      if (session.user.email) {
        sendWelcomeEmail(session.user.email, session.user.name || "there").catch(console.error);
      }

      return { success: true as const, data: result };
    }

    return { success: false as const, error: "Invalid flow" };
  } catch (error) {
    console.error("[onboarding]", error);
    const message =
      error instanceof Error
        ? error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")
          ? "We couldn't reach the AI service. Check your internet connection and try again."
          : error.message.includes("429") || error.message.includes("rate limit")
          ? "The AI service is busy right now. Give it a moment and try again."
          : error.message.includes("timeout") || error.message.includes("timed out")
          ? "The AI took too long to respond. Please try again — it usually works on the second go."
          : /placeholder|API_KEY|apiKey|secret/i.test(error.message)
          ? "The AI service isn't configured yet. Contact the admin to set it up."
          : "Something went wrong while creating your plan. Try again."
        : "An unexpected issue came up while creating your plan. Try again.";
    return { success: false as const, error: message };
  }
}
