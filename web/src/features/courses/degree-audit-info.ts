/**
 * Explanatory copy for the Degree Audit tab, kept out of the component the way
 * `features/legal/content.ts` is. The audit is the one screen students are
 * asked to trust with a graduation decision, so the article is part of the
 * feature, not decoration.
 *
 * Written by the SG Ministry of Research and Innovations — treat the wording as
 * theirs and check with them before editing anything but typography.
 */

export const DEGREE_AUDIT_INFO = {
  title: "NU Degree Audit: How It Works",
  author: {
    name: "Baurzhan Kizatov",
    role: "MRI",
    telegram: "https://t.me/greysonRb",
  },
  lastUpdated: "13 December 2025",

  /**
   * The audit is advisory. This is the first thing on the page for a reason:
   * the handbook it reads from is itself sometimes wrong, and only a Program
   * Director can confirm that a degree is complete.
   */
  disclaimer: [
    "The output is preliminary and based on the Academic Handbook provided by the Academic Advising Office. The handbook itself may contain inaccuracies, and degree requirements change over time without always being reflected in it.",
    "Use this as a guiding reference, not a final confirmation. Degree completion is confirmed exclusively by Program Directors. We do not take responsibility for any discrepancies.",
    "If you notice any errors, please report them to us.",
  ],
  signature: {
    text: "SG Ministry of Research and Innovations",
    href: "https://t.me/nu_mri",
  },

  introduction: [
    "The NU Degree Audit helps you see how the courses you have already passed apply toward your degree requirements.",
    "Students often struggle to work out which course counts toward which elective, which leads to taking courses they did not need or missing ones they did. The audit answers that automatically and consistently.",
    "Instead of checking a transcript against program rules by hand, this explains what the system does, how it reads your transcript, and how to read the result.",
  ],

  sections: [
    {
      title: "What it does",
      description: "It answers four questions:",
      points: [
        "What courses have you taken and passed?",
        "What are the degree requirements for your admission year and major?",
        "Which of your courses satisfy which requirements?",
        "How many credits are completed, applied, and still remaining?",
      ],
      footnote:
        "It reads your transcript, matches courses to requirements, applies credits without double-counting, and produces an audit you can download as CSV.",
    },
    {
      title: "What the system reads",
      points: [
        "Your unofficial transcript (PDF): course code, title, grade and credits. Non-credit grades — AU, AW, I, IP, W — are ignored.",
        "Degree requirements (CSV), organised by admission year and major: required courses and groups, credit targets, minimum grades, permitted alternatives and exclusions.",
      ],
    },
    {
      title: "Step by step, after you click Audit",
      points: [
        "Select your admission year and major, and provide your transcript.",
        "The transcript is parsed: courses and grades are normalised, and a retaken course keeps its latest valid attempt.",
        "The degree requirements for that year and major are loaded.",
        "Requirements are matched from the most specific to the most general, checking course patterns, minimum grade and exclusions. Credits are consumed until a target is met, and no credit counts twice.",
        "Each requirement comes back Satisfied or Pending, satisfied ones first, with the whole result available as CSV.",
      ],
    },
    {
      title: "Why it is reliable",
      points: [
        "No manual interpretation of the handbook.",
        "No double-counted credits.",
        "Retakes handled correctly.",
        "Official degree rules respected as written.",
        "Transparent, reproducible logic — the same transcript always gives the same answer.",
      ],
    },
  ],
} as const
