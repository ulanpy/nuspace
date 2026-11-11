from backend.modules.courses.degree_audit.transcript_parser import parse_transcript_lines


def test_legacy_transcript_layout() -> None:
    transcript = parse_transcript_lines(
        [
            "Student Name: Test Student",
            "Primary Major: Computer Science",
            "Fall 2022",
            "Course Code Course Title Grade Credits",
            "ECTS",
            "Grade",
            "Points",
            "CSCI 151 Introduction to Programming A 6 4.0",
            "MATH 161A Calculus I B+ 6 3.33",
            "T - HIST 101 World History TC 6 n/a",
            "Semester GPA: 3.67",
            "Credits Enrolled: 12",
            "Credits Earned: 12",
            "Overall",
            "GPA: 3.67 Credits Enrolled: 12 Credits Earned: 12",
        ]
    )

    assert transcript.metadata["Student Name"] == "Test Student"
    assert transcript.overall_gpa == 3.67
    assert transcript.overall_credits_earned == 12
    semester = transcript.semesters[0]
    assert semester.name == "Fall 2022"
    assert semester.semester_gpa == 3.67
    assert [(c.code, c.grade) for c in semester.courses] == [
        ("CSCI 151", "A"),
        ("MATH 161A", "B+"),
        ("HIST 101", "TC"),
    ]


def test_registrar_layout_with_wrapped_codes_and_transfer_credit() -> None:
    transcript = parse_transcript_lines(
        [
            "16-10-2026 13:51:04 1/1",
            "Student Name: Karim Galiyev",
            "Primary Major: Political Science and International",
            "Relations",
            "ID# 202219361",
            "Program: Bachelor of Arts in Political Science and",
            "International Relations",
            "Fall 2025 Grd ECTS QPts",
            "PLS 210 Political Science Research",
            "Methods A- 6 3.67",
            "HST 375/TUR",
            "375/ANT 375/SOC",
            "375",
            "Inner Asian Frontiers of China: A",
            "Cultural Perspective B 6 3",
            "Transferred courses from Universiti Malaya, Malaysia Grd ECTS QPts",
            "T - AIC 2004 Postcolonial Literature: Themes and",
            "Tropes TC 6 n/a",
            "Semester AttCr: 18 Cr: 18 GPA:",
            "3.50 | Cumulative Cr: 18 GPA:",
            "3.50",
            "Cumulative GPA: 3.50",
            "* - not included in calculation of the GPA or in earned credits.",
            "----------------------------END OF TRANSCRIPT---------------------------",
        ]
    )

    assert transcript.metadata["Primary Major"] == "Political Science and International Relations"
    assert transcript.metadata["Program"] == (
        "Bachelor of Arts in Political Science and International Relations"
    )
    assert transcript.metadata["ID#"] == "202219361"
    assert "16-10-2026 13" not in transcript.metadata
    assert transcript.overall_gpa == 3.50
    assert transcript.overall_credits_earned == 18

    semester = transcript.semesters[0]
    assert semester.name == "Fall 2025"
    assert semester.semester_gpa == 3.50
    assert semester.credits_enrolled == 18
    assert semester.credits_earned == 18
    assert [(c.code, c.title, c.grade, c.grade_points) for c in semester.courses] == [
        ("PLS 210", "Political Science Research Methods", "A-", 3.67),
        (
            "HST 375/TUR 375/ANT 375/SOC 375",
            "Inner Asian Frontiers of China: A Cultural Perspective",
            "B",
            3.0,
        ),
        ("AIC 2004", "Postcolonial Literature: Themes and Tropes", "TC", 0.0),
    ]
