"use client";

import { useSearchParams } from "next/navigation";
import { DashboardQuizView } from "@/components/dashboard/DashboardQuizView";

export function DashboardPageClient() {
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quiz");
  return <DashboardQuizView key={quizId} />;
}
