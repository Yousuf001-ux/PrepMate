"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NumberCounter } from "@/components/onboarding/NumberCounter";
import { chatmateStudyPlan } from "@/actions/chatmate-tools";
import { toast } from "sonner";

interface ChatmateStudyPlanFlowProps {
  onBack: () => void;
}

interface CourseInputData {
  id: string;
  name: string;
  topics: string[];
  examDate: string;
}

type Step = "COURSE_COUNT" | "COURSE_DETAILS" | "AVAILABILITY" | "PROCESSING";

export function ChatmateStudyPlanFlow({ onBack }: ChatmateStudyPlanFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("COURSE_COUNT");
  const [courseCount, setCourseCount] = useState(1);
  const [courses, setCourses] = useState<CourseInputData[]>([]);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [sessionName, setSessionName] = useState("");

  const handleNextToDetails = () => {
    const newCourses = [...courses];
    while (newCourses.length < courseCount) {
      newCourses.push({
        id: crypto.randomUUID(),
        name: "",
        topics: [""],
        examDate: "",
      });
    }
    setCourses(newCourses.slice(0, courseCount));
    setStep("COURSE_DETAILS");
  };

  const handleNextToAvailability = () => {
    if (!sessionName.trim()) {
      toast.error("Give your study session a name so we can keep things organized.");
      return;
    }
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const courseLabel = `Course ${i + 1}`;
      if (!course.name.trim()) {
        toast.error(`${courseLabel} is missing a name — give it a label so we can plan around it.`);
        return;
      }
      if (!course.examDate) {
        toast.error(`${courseLabel} ("${course.name.trim()}") needs an exam date so we know when to finish.`);
        return;
      }
      const validTopics = course.topics.filter(t => t.trim() !== "");
      if (validTopics.length === 0) {
        toast.error(`${courseLabel} ("${course.name.trim()}") needs at least one topic to study.`);
        return;
      }
    }
    setStep("AVAILABILITY");
  };

  const handleSubmit = async () => {
    setStep("PROCESSING");
    try {
      const cleanedCourses = courses.map(c => ({
        ...c,
        topics: c.topics.filter(t => t.trim() !== ""),
      }));

      const result = await chatmateStudyPlan({
        sessionName: sessionName.trim(),
        courses: cleanedCourses,
        hoursPerDay,
      });

      if (result.success) {
        window.dispatchEvent(new Event("history-updated"));
        router.push("/study-plan");
      } else {
        toast.error(result.error || "Something went wrong while building your study plan. Let's try again.");
        setStep("AVAILABILITY");
      }
    } catch (error) {
      console.error(error);
      toast.error("A network or system error interrupted us. Try again.");
      setStep("AVAILABILITY");
    }
  };

  const updateCourse = (id: string, field: keyof CourseInputData, value: any) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addTopic = (courseId: string) => {
    setCourses(courses.map(c =>
      c.id === courseId ? { ...c, topics: [...c.topics, ""] } : c
    ));
  };

  const updateTopic = (courseId: string, topicIndex: number, value: string) => {
    setCourses(courses.map(c => {
      if (c.id === courseId) {
        const newTopics = [...c.topics];
        newTopics[topicIndex] = value;
        return { ...c, topics: newTopics };
      }
      return c;
    }));
  };

  const removeTopic = (courseId: string, topicIndex: number) => {
    setCourses(courses.map(c => {
      if (c.id === courseId) {
        const newTopics = c.topics.filter((_, i) => i !== topicIndex);
        return { ...c, topics: newTopics.length ? newTopics : [""] };
      }
      return c;
    }));
  };

  if (step === "PROCESSING") {
    return (
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-headline-small text-foreground">Creating your personalized study plan...</h2>
          <p className="text-body-medium text-muted-foreground">This may take a few moments as AI analyzes your courses.</p>
        </div>
      </div>
    );
  }

  const progress = step === "COURSE_COUNT" ? 33 : step === "COURSE_DETAILS" ? 66 : 100;

  return (
    <div className="flex-1 flex flex-col items-center w-full animate-in fade-in duration-300">
      <div className="fixed top-0 z-50 bg-sidebar/50 backdrop-blur-md left-0 md:left-[var(--sidebar-width)] right-0 flex justify-center pt-2">
        <div className="w-full md:w-[60%] px-4 md:px-0 flex flex-col gap-4">
        <Button variant="ghost" size="icon" onClick={step === "COURSE_COUNT" ? onBack : step === "COURSE_DETAILS" ? () => setStep("COURSE_COUNT") : () => setStep("COURSE_DETAILS")}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Progress value={progress} className="h-2 w-full" />
      </div>
      </div>

      <div className="flex-1 flex flex-col w-full max-sm:pt-4 pt-8">
        {step === "COURSE_COUNT" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="flex flex-col items-center space-y-12 max-sm:pb-24">
            <h2 className="text-headline-medium text-foreground font-medium text-center">
              How many courses are you taking?
            </h2>
            <NumberCounter value={courseCount} min={1} max={20} onChange={setCourseCount} />
            <Button size="lg" className="hidden sm:flex w-full md:w-auto mt-8 rounded-full px-8 h-14" onClick={handleNextToDetails}>
              Next
            </Button>
            <div className="fixed bottom-0 left-0 w-full px-4 py-4 bg-background/80 backdrop-blur-md flex justify-start z-10 sm:hidden">
              <Button size="lg" className="w-full rounded-full px-8 h-14" onClick={handleNextToDetails}>
                Next
              </Button>
            </div>
          </div>
          </div>
        )}

        {step === "COURSE_DETAILS" && (
          <div className="flex flex-col items-center mx-auto w-full md:w-[60%] px-4 md:px-0 space-y-10 pb-24 pt-6">
            <h2 className="text-headline-medium text-foreground font-medium text-left w-full mb-0">
              Tell us about your courses
            </h2>
            <p className="text-body-medium text-muted-foreground text-left w-full -mt-1 mb-4">
              Name your session, set the exam date, and list your courses and topics.
            </p>

            <div className="w-full space-y-6">
              <Card className="w-full bg-background">
                <CardContent className="space-y-3 pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="session-name">Session Name <span className="text-destructive">*</span></Label>
                    <Input
                      autoFocus
                      id="session-name"
                      placeholder="e.g. Midterm Prep"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {courses.map((course, idx) => (
                <Card key={course.id} className="w-full bg-background relative">
                  <CardHeader>
                    <span className={`absolute top-3 right-3 inline-flex items-center justify-center h-7 w-7 rounded-full text-label-small font-medium z-10 ${course.name.trim() && course.examDate && course.topics.some(t => t.trim()) ? "bg-palette-tertiary-60 text-white" : "bg-muted-foreground/15 text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${course.id}`}>Course Name <span className="text-destructive">*</span></Label>
                      <Input
                        id={`name-${course.id}`}
                        placeholder="e.g. Human Anatomy"
                        value={course.name}
                        onChange={(e) => updateCourse(course.id, "name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`date-${course.id}`}>Exam Date <span className="text-destructive">*</span></Label>
                      <Input
                        id={`date-${course.id}`}
                        type="date"
                        value={course.examDate}
                        onChange={(e) => updateCourse(course.id, "examDate", e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Topics <span className="text-destructive">*</span></Label>
                      {course.topics.map((topic, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. Cardiovascular System"
                            value={topic}
                            onChange={(e) => updateTopic(course.id, tIdx, e.target.value)}
                          />
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeTopic(course.id, tIdx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="border-dashed border-2 h-10" onClick={() => addTopic(course.id)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Topic
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="fixed bottom-0 z-10 bg-sidebar/50 backdrop-blur-md py-4 left-0 right-0 md:left-[var(--sidebar-width)]">
              <div className="mx-auto w-full md:w-[60%] flex justify-end px-4 md:px-0">
                <Button size="lg" className="w-full md:w-auto rounded-full px-8 h-14" onClick={handleNextToAvailability}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "AVAILABILITY" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="flex flex-col items-center space-y-12">
            <h2 className="text-headline-medium text-foreground font-medium text-center">
              How many hours can you study per day?
            </h2>
            <NumberCounter value={hoursPerDay} min={1} max={16} onChange={setHoursPerDay} />
            {hoursPerDay >= 10 && (
              <p className="text-body-medium text-warning text-center max-w-sm -mt-6">
                That's a lot! Remember to be honest with yourself — consistency beats intensity. Pace yourself so you can stick with it.
              </p>
            )}
            <Button size="lg" className="w-full md:w-auto mt-8 rounded-full px-8 h-14" onClick={handleSubmit}>
              Generate Study Plan
            </Button>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
