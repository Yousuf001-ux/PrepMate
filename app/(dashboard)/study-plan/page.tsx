"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Clock,
  Check,
  Loader2,
} from "lucide-react"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface Topic {
  id: string
  name: string
  course?: { id: string; name: string; courseId?: string }
}

interface StudySession {
  id: string
  scheduledDate: string
  durationMinutes: number
  status: "pending" | "complete" | "missed"
  topic: Topic
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function getMonthGrid(year: number, month: number): (number | null)[] {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  return days
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function MonthCalendar({
  year,
  month,
  sessionsMap,
  selectedDate,
  onSelectDate,
}: {
  year: number
  month: number
  sessionsMap: Map<string, StudySession[]>
  selectedDate: Date | undefined
  onSelectDate: (date: Date) => void
}) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month])
  const today = new Date()

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-muted-foreground py-2 select-none"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }
          const date = new Date(year, month, day)
          const dateStr = toDateStr(date)
          const sessions = sessionsMap.get(dateStr) ?? []
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const isTodayDate = isToday(date)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative flex flex-col items-center justify-center aspect-square rounded-lg text-sm transition-colors select-none cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : isTodayDate
                    ? "bg-muted text-foreground font-semibold"
                    : "text-foreground hover:bg-muted/60",
                sessions.length > 0 && !isSelected && "font-medium"
              )}
            >
              <span>{day}</span>
              {sessions.length > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5",
                    isSelected ? "opacity-100" : ""
                  )}
                >
                  {sessions.length <= 3 ? (
                    sessions.map((s, i) => (
                      <span
                        key={i}
                        className={cn(
                          "size-1 rounded-full",
                          s.status === "complete"
                            ? "bg-green-500"
                            : s.status === "missed"
                              ? "bg-red-500"
                              : isSelected
                                ? "bg-primary-foreground/80"
                                : "bg-primary"
                        )}
                      />
                    ))
                  ) : (
                    <span className={cn(
                      "text-[10px] leading-none",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {sessions.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function StudyPlanPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [sessionsMap, setSessionsMap] = useState<Map<string, StudySession[]>>(new Map())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")

  useEffect(() => {
    async function loadData() {
      try {
        const planRes = await fetch("/api/study-plans")
        const planJson = await planRes.json()
        const allPlans = planJson.data ?? []
        setPlans(allPlans)

        const urlPlanId = searchParams.get("planId")
        const target = urlPlanId
          ? allPlans.find((p: any) => p.id === urlPlanId)
          : allPlans[0]
        if (target) setSelectedPlanId(target.id)

        const map = new Map<string, StudySession[]>()
        if (target) {
          for (const s of target.sessions) {
            const key = toDateStr(new Date(s.scheduledDate))
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(s)
          }
        }
        setSessionsMap(map)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [searchParams])

  useEffect(() => {
    const selected = plans.find((p) => p.id === selectedPlanId)
    const map = new Map<string, StudySession[]>()
    if (selected) {
      for (const s of selected.sessions) {
        const key = toDateStr(new Date(s.scheduledDate))
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(s)
      }
    }
    setSessionsMap(map)
  }, [plans, selectedPlanId])

  const allSessions: StudySession[] = useMemo(() => {
    const sessions: StudySession[] = []
    for (const s of sessionsMap.values()) sessions.push(...s)
    return sessions
  }, [sessionsMap])

  const selectedSessions = useMemo(() => {
    const dateStr = toDateStr(selectedDate)
    return sessionsMap.get(dateStr) ?? []
  }, [sessionsMap, selectedDate])

  const completedCount = allSessions.filter((s) => s.status === "complete").length
  const totalSessions = allSessions.length
  const totalMinutes = allSessions.reduce((a, s) => a + s.durationMinutes, 0)
  const progressPct = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0

  const handleToggleStatus = useCallback(async (session: StudySession) => {
    const newStatus = session.status === "complete" ? "pending" : "complete"
    setUpdatingSessionId(session.id)
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update")
      const json = await res.json()
      const updated = json.data

      setSessionsMap((prev) => {
        const next = new Map(prev)
        for (const [dateStr, sessions] of next) {
          const idx = sessions.findIndex((s) => s.id === session.id)
          if (idx !== -1) {
            const updatedList = [...sessions]
            updatedList[idx] = { ...updatedList[idx], status: updated.status }
            next.set(dateStr, updatedList)
            break
          }
        }
        return next
      })

      setPlans((prev: any[]) =>
        prev.map((p) =>
          p.id === selectedPlanId
            ? { ...p, sessions: p.sessions.map((s: StudySession) =>
                s.id === session.id ? { ...s, status: updated.status } : s
              )}
            : p
        )
      )
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingSessionId(null)
    }
  }, [])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const nextMonth2 = currentMonth === 11 ? 0 : currentMonth + 1
  const nextYear2 = currentMonth === 11 ? currentYear + 1 : currentYear

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    )
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  if (plans.length === 0 || !selectedPlan || selectedPlan.sessions.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-large text-foreground">Study Plan</h1>
            <p className="text-body-small text-muted-foreground">Your AI-generated study schedule</p>
          </div>
          <Link href="/chatmate?flow=study_plan">
            <Button variant="default">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Plan
            </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/20 py-16">
          <CalendarDays className="size-10 text-muted-foreground" />
          <p className="text-title-medium text-foreground">No study plan yet</p>
          <p className="text-body-small text-muted-foreground">
            Generate a study plan to see your schedule.
          </p>
          <Link href="/chatmate?flow=study_plan">
            <Button variant="default">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Plan
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-title-large text-foreground">Study Plan</h1>
          <p className="text-body-small text-muted-foreground">
            {totalSessions} sessions &middot; {formatDuration(totalMinutes)} total &middot;{" "}
            {completedCount} completed
          </p>
        </div>
        <Link href="/chatmate?flow=study_plan" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Study Plan
        </Link>
      </div>

      <div className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {completedCount}/{totalSessions} ({progressPct}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border/20 bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
              <button
                onClick={prevMonth}
                className="inline-flex items-center justify-center rounded-lg size-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-semibold text-foreground min-w-[8rem] text-center">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>
                <h2 className="text-sm font-semibold text-foreground min-w-[8rem] text-center max-xl:hidden">
                  {MONTH_NAMES[nextMonth2]} {nextYear2}
                </h2>
              </div>
              <button
                onClick={nextMonth}
                className="inline-flex items-center justify-center rounded-lg size-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <MonthCalendar
                  year={currentYear}
                  month={currentMonth}
                  sessionsMap={sessionsMap}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
                <div className="max-xl:hidden">
                  <MonthCalendar
                    year={nextYear2}
                    month={nextMonth2}
                    sessionsMap={sessionsMap}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:w-80 2xl:w-96 shrink-0">
          <div className="rounded-xl border border-border/20 bg-card h-full">
            <div className="px-5 py-3 border-b border-border/20">
              <h3 className="text-sm font-semibold text-foreground">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedSessions.length > 0
                  ? `${selectedSessions.length} session${selectedSessions.length > 1 ? "s" : ""}`
                  : "No sessions scheduled"}
              </p>
            </div>
            <div className="p-3 flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {selectedSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No study sessions on this day
                </p>
              ) : (
                selectedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-border/20 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {session.topic.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="size-3 shrink-0" />
                          <span>{formatDuration(session.durationMinutes)}</span>
                          {session.topic.course?.name && (
                            <>
                              <span>&middot;</span>
                              <span className="truncate">{session.topic.course.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {session.status === "complete" ? (
                        <button
                          onClick={() => handleToggleStatus(session)}
                          disabled={updatingSessionId === session.id}
                          className="shrink-0 flex items-center justify-center size-7 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {updatingSessionId === session.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </button>
                      ) : session.status === "missed" ? (
                        <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0">
                          missed
                        </Badge>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(session)}
                          disabled={updatingSessionId === session.id}
                          className="shrink-0 flex items-center justify-center size-7 rounded-full border-2 border-muted-foreground/30 hover:border-green-500 hover:bg-green-500/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {updatingSessionId === session.id && (
                            <Loader2 className="size-3.5 animate-spin" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
