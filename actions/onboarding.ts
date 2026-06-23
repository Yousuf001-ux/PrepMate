"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStudyPlan } from "@/lib/ai/study-plan";
import { generateSummary } from "@/lib/ai/summarizer";
import { generateQuiz } from "@/lib/ai/quiz";

const CourseInputSchema = z.object({
  name: z.string().min(1),
  topics: z.array(z.string().min(1)).min(1),
  examDate: z.string(),
});

const StudyPlanDataSchema = z.object({
  courses: z.array(CourseInputSchema).min(1),
  hoursPerDay: z.number().min(1).max(16),
});

const SummarizeTopicDataSchema = z.object({
  topic: z.string().min(1),
});

const GenerateQuizDataSchema = z.object({
  topic: z.string().min(1),
  questionCount: z.number().min(5).max(50),
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
      await prisma.$transaction(async (tx) => {
        // Create courses and topics
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

        // Find topic IDs to link sessions
        const getTopicId = (courseName: string, topicName: string) => {
          for (const c of dbCourses) {
            if (c.name.toLowerCase() === courseName.toLowerCase()) {
              const t = c.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
              if (t) return t.id;
            }
          }
          // Fallback if AI hallucinates names: use the first topic of the first course
          return dbCourses[0].topics[0].id; 
        };

        const dbStudyPlan = await tx.studyPlan.create({
          data: {
            userId,
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
      });

      return { success: true as const, data: { status: "created" } };

    } else if (input.flow === "SUMMARIZE_TOPIC") {
      const parsed = SummarizeTopicDataSchema.safeParse(input.data);
      if (!parsed.success) return { success: false as const, error: "Invalid input" };

      const aiSummary = await generateSummary(parsed.data.topic);

      await prisma.$transaction(async (tx) => {
        await tx.summary.create({
          data: {
            userId,
            title: parsed.data.topic.substring(0, 100),
            content: {
              explanation: aiSummary.summary,
              keyConcepts: aiSummary.keyConcepts,
            }
          }
        });

        await tx.user.update({
          where: { id: userId },
          data: { onboardingCompleted: true }
        });
      });

      return { success: true as const, data: { explanation: aiSummary.summary, keyConcepts: aiSummary.keyConcepts } };

    } else if (input.flow === "GENERATE_QUIZ") {
      const parsed = GenerateQuizDataSchema.safeParse(input.data);
      if (!parsed.success) return { success: false as const, error: "Invalid input" };

      // We need a dummy course/topic if the user hasn't created one, because Quiz requires a topicId.
      // For onboarding, if they do quick Generate Quiz, we'll create a generic Course and Topic.
      const aiQuiz = await generateQuiz({
        topic: parsed.data.topic,
        numQuestions: parsed.data.questionCount
      });

      const result = await prisma.$transaction(async (tx) => {
        const course = await tx.course.create({
          data: {
            userId,
            name: "Quick Quizzes",
            examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
            topics: {
              create: [{ name: parsed.data.topic.substring(0, 100) }]
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
