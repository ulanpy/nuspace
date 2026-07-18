"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RegisteredCourse } from "../types";
import {
  mockInitialWeekTotal,
  mockWeekDayHours,
  mockWeeklyTargetHours,
  sumDayHours,
  type WeekDayHours,
} from "../utils/mock-study-hours";

type CourseHoursState = {
  target: number;
  days: WeekDayHours[];
};

function buildInitial(course: RegisteredCourse): CourseHoursState {
  const target = mockWeeklyTargetHours(course.id, course.course.credits);
  const weekTotal = mockInitialWeekTotal(course.id, target);
  return {
    target,
    days: mockWeekDayHours(course.id, weekTotal),
  };
}

/**
 * Prototype study-hours state: seeded mock per course, mutable in-session.
 * Not persisted to the backend.
 */
export function useMockStudyHours(courses: RegisteredCourse[]) {
  const [byCourseId, setByCourseId] = useState<Record<number, CourseHoursState>>({});

  useEffect(() => {
    setByCourseId((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const course of courses) {
        if (!next[course.id]) {
          next[course.id] = buildInitial(course);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [courses]);

  const getHours = useCallback(
    (courseId: number | null | undefined) => {
      if (courseId == null) return null;
      return byCourseId[courseId] ?? null;
    },
    [byCourseId],
  );

  const adjustDayHours = useCallback((courseId: number, dayIndex: number, delta: number) => {
    setByCourseId((prev) => {
      const current = prev[courseId];
      if (!current || dayIndex < 0 || dayIndex >= current.days.length) return prev;
      const days = current.days.map((day, index) => {
        if (index !== dayIndex) return day;
        const next = Math.max(0, Math.round((day.hours + delta) * 2) / 2);
        return { ...day, hours: next };
      });
      return { ...prev, [courseId]: { ...current, days } };
    });
  }, []);

  const totalsByCourseId = useMemo(() => {
    const map: Record<number, number> = {};
    for (const [id, state] of Object.entries(byCourseId)) {
      map[Number(id)] = sumDayHours(state.days);
    }
    return map;
  }, [byCourseId]);

  return { getHours, adjustDayHours, totalsByCourseId };
}
