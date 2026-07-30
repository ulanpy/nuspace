import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseSectionDays,
  sectionsTimeConflict,
} from "./schedule-quality";

describe("parseSectionDays", () => {
  it("ignores spaces in registrar day strings", () => {
    assert.deepEqual(parseSectionDays("T R"), ["T", "R"]);
    assert.deepEqual(parseSectionDays("M W F"), ["M", "W", "F"]);
    assert.deepEqual(parseSectionDays("M T W R"), ["M", "T", "W", "R"]);
  });

  it("keeps compact day strings", () => {
    assert.deepEqual(parseSectionDays("MWF"), ["M", "W", "F"]);
  });
});

describe("sectionsTimeConflict", () => {
  it("does not clash when times overlap but days do not (spaced day strings)", () => {
    assert.equal(
      sectionsTimeConflict(
        { days: "T R", times: "09:00 AM-10:15 AM" },
        { days: "M W F", times: "09:00 AM-09:50 AM" },
      ),
      false,
    );
    assert.equal(
      sectionsTimeConflict(
        { days: "M W F", times: "10:00 AM-10:50 AM" },
        { days: "T R", times: "09:00 AM-10:15 AM" },
      ),
      false,
    );
  });

  it("still clashes on a shared day with overlapping times", () => {
    assert.equal(
      sectionsTimeConflict(
        { days: "M W F", times: "10:00 AM-10:50 AM" },
        { days: "M W F", times: "09:30 AM-10:20 AM" },
      ),
      true,
    );
  });

  it("allows back-to-back sections on the same days", () => {
    assert.equal(
      sectionsTimeConflict(
        { days: "M W F", times: "09:00 AM-09:50 AM" },
        { days: "M W F", times: "10:00 AM-10:50 AM" },
      ),
      false,
    );
  });
});
