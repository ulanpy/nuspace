"use client";

import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { Link } from "react-router-dom";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Button } from "@/components/atoms/button";
import { ROUTES } from "@/data/routes";

const paragraphs = [
  "The NU Degree Audit tool is designed to help students clearly understand how their completed courses apply toward their degree requirements.",
  "The main goal is to help you track your graduation path and reduce stress. Students often struggle to identify which course belongs to which elective, which can lead to taking unnecessary courses or missing required ones.",
  "Instead of manually checking transcripts against program rules, the system performs this audit automatically and consistently.",
  "This article explains what the system does, how it processes your transcript, and how to read the results.",
];

const steps = [
  {
    title: "What the NU Degree Audit Does",
    body: [
      "Answers four key questions:",
      "• What courses have you taken and passed?",
      "• What are the degree requirements for your admission year and major?",
      "• Which of your courses satisfy which requirements?",
      "• How many credits are completed, applied, and still remaining?",
      "Process: reads your transcript, matches courses to requirements, applies credits intelligently (no double-counting), outputs a clear audit + CSV.",
    ],
  },
  {
    title: "Your Data: What the System Reads",
    body: [
      "📄 Unofficial Transcript (PDF): extracts course code, title, grade, credits; ignores non-credit grades (AU, AW, I, IP, W).",
      "📋 Degree Requirements (CSV): organized by admission year & major. Defines required courses/groups, credit targets, minimum grades, allowed alternatives and exclusions.",
    ],
  },
  {
    title: "Step-by-Step After You Click “Audit”",
    body: [
      "1) Upload & select: admission year, major, transcript.",
      "2) Transcript parsing: normalize courses/grades; retakes keep the latest valid attempt.",
      "3) Load degree requirements for your year/major.",
      "4) Auditing logic: from specific to general; checks patterns, min grade, exclusions; consumes credits until target, without double-counting.",
      "5) Results: each requirement is Satisfied or Pending; sorted with satisfied first; CSV available.",
    ],
  },
  {
    title: "Why This Is Reliable",
    body: [
      "✔ No manual interpretation",
      "✔ No double-counting credits",
      "✔ Handles retakes correctly",
      "✔ Respects official degree rules",
      "✔ Transparent, reproducible logic",
    ],
  },
];

export default function DegreeAuditInfoPage() {
  return (
    <MotionWrapper>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpenCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">NU Degree Audit: How It Works</h1>
              <p className="text-sm text-muted-foreground">
                By{" "}
                <a
                  href="https://t.me/greysonRb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Baurzhan Kizatov
                </a>
                , MRI
              </p>
              <p className="text-xs text-muted-foreground">Last updated: Dec 13, 2025</p>
            </div>
          </div>
          <Button asChild variant="ghost" className="h-9 rounded-full px-3 text-xs font-medium">
            <Link to={`${ROUTES.COURSES}?tab=degree-audit`} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Courses
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="space-y-3 text-sm leading-relaxed text-foreground">
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="grid gap-4">
            {steps.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2"
              >
                <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                <div className="text-sm text-foreground/90 leading-relaxed space-y-1">
                  {section.body.map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}

