# Planner Auto-Build Notes

## High-level logic
1. Ensure each planner course has up-to-date registrar sections.
2. For every course:
   - Filter out sections that are already full.
   - Group remaining sections by “type” (e.g., lecture, lab).
   - Build every cross-product of these groups (each combo is a schedule “slot” for the course).
3. Run a backtracking search that walks courses in random order, places a slot if it doesn’t overlap with existing occupancy (including unavailable blocks), and tracks the partial schedule.
4. Keep track of the best solutions (largest number of scheduled courses) and pick a random one to return.

## Why we cap things
The raw combinatorics (course combos × schedule assignments) can explode, causing multi-GB memory growth and multi-minute responses. To keep the endpoint responsive and prevent OOMs we use two caps:

| Cap | Constant | Effect |
| --- | --- | --- |
| Max section combos per course | `MAX_SECTION_COMBINATIONS = 200` | Stops `_build_section_combinations` from exploring more than 200 cross-product slots per course. |
| Max stored assignment candidates | `MAX_ASSIGNMENT_CANDIDATES = 32` | Limits how many “best” schedules we retain while backtracking, keeping memory bounded while preserving randomness. |

Both caps are soft ceilings: if fewer combos/candidates exist, we keep them all. Hitting a cap doesn’t break correctness—it just means we rely on a random sample of solutions. Feel free to tune the constants as course loads change; higher numbers yield more variety but cost more CPU/RAM.

