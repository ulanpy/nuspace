from __future__ import annotations

import base64
import tempfile
from pathlib import Path

from flask import Flask, Response, flash, redirect, render_template_string, request, url_for

from degree_audit import (
    audit_results_to_csv_string,
    audit_transcript,
    load_requirements,
    format_credit,
    compute_credit_summary,
    discover_requirements_by_year,
    requirement_for_major_year,
)
from transcript_parser import parse_transcript

app = Flask(__name__)
app.secret_key = "degree-audit-dev"  # used for flash messages only

REQUIREMENTS_BY_YEAR = discover_requirements_by_year()


def _default_year() -> str:
    return sorted(REQUIREMENTS_BY_YEAR.keys())[-1] if REQUIREMENTS_BY_YEAR else ""


def render_form(results=None, csv_payload=None, selected_major=None, summary=None, selected_year=None):
    template = """
    <!doctype html>
    <html>
    <head>
      <title>NU Degree Audit</title>
      <style>
        body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; margin: 24px; background: #f7f8fb; color: #1f1f1f; }
        .card { max-width: 1000px; margin: 0 auto; background: #fff; padding: 16px 20px; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.05); }
        h2 { margin-top: 0; }
        form.upload { display: grid; gap: 12px; margin-bottom: 20px; }
        label { font-weight: 600; font-size: 14px; }
        select, input[type="text"], input[type="file"], button { font-size: 14px; padding: 8px 10px; border-radius: 8px; border: 1px solid #c8cdd8; width: 100%; box-sizing: border-box; }
        button { background: #1f7aec; color: white; border: none; cursor: pointer; font-weight: 600; }
        button:hover { background: #1865c2; }
        .error { color: #b00020; margin: 0 0 12px; }
        table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 12.5px; }
        th, td { border: 1px solid #e3e5ea; padding: 6px; }
        th { background: #f1f3f8; text-align: left; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
        .ok { background: #d1f5e0; color: #155724; }
        .pending { background: #ffe4c4; color: #8a4b0f; }
        .controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .controls button { width: auto; padding: 8px 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>NU Degree Audit (no transcripts stored)</h2>
        {% with messages = get_flashed_messages() %}
          {% if messages %}
            <ul class="error">
            {% for msg in messages %}
              <li>{{ msg }}</li>
            {% endfor %}
            </ul>
          {% endif %}
        {% endwith %}
        <form class="upload" method="post" action="{{ url_for('run_audit') }}" enctype="multipart/form-data">
          <div>
            <label>Admission year</label>
            <select name="year" required>
              {% for year in years %}
                <option value="{{ year }}" {% if year == selected_year %}selected{% endif %}>{{ year }}</option>
              {% endfor %}
            </select>
          </div>
          <div>
            <label>Major</label>
            <select name="major" required>
              {% for major in majors %}
                <option value="{{ major }}" {% if major == selected_major %}selected{% endif %}>{{ major }}</option>
              {% endfor %}
            </select>
          </div>
          <div>
            <label>Transcript PDF</label>
            <input type="file" name="transcript" accept="application/pdf" required />
          </div>
          <div class="controls">
            <button type="submit">Run audit</button>
          </div>
        </form>

        {% if results %}
          <h3>Audit Results</h3>
          {% if summary %}
            <div>
              <strong>Credits taken:</strong> {{ summary.total_taken }} |
              <strong>Required by plan:</strong> {{ summary.total_required }} |
              <strong>Applied to plan:</strong> {{ summary.total_applied }} |
              <strong>Remaining:</strong> {{ summary.total_remaining }}
            </div>
          {% endif %}
          <form method="post" action="{{ url_for('download') }}">
            <input type="hidden" name="data" value="{{ csv_payload }}">
            <input type="hidden" name="filename" value="audit_results.csv">
            <button type="submit">Download CSV</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Course code</th>
                <th>Name</th>
                <th>Req credits</th>
                <th>Min grade</th>
                <th>Status</th>
                <th>Used courses</th>
                <th>Credits applied</th>
                <th>Credits remaining</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {% for row in results %}
                <tr>
                  <td>{{ row.course_code }}</td>
                  <td>{{ row.course_name }}</td>
                  <td>{{ row.credits_required }}</td>
                  <td>{{ row.min_grade }}</td>
                  <td>
                    <span class="pill {% if row.status == 'Satisfied' %}ok{% else %}pending{% endif %}">{{ row.status }}</span>
                  </td>
                  <td>{{ row.used_courses }}</td>
                  <td>{{ row.credits_applied }}</td>
                  <td>{{ row.credits_remaining }}</td>
                  <td>{{ row.note }}</td>
                </tr>
              {% endfor %}
            </tbody>
          </table>
        {% endif %}
      </div>
      <script>
        const majorsByYear = {{ majors_by_year | tojson }};
        const yearSelect = document.querySelector('select[name="year"]');
        const majorSelect = document.querySelector('select[name="major"]');
        const initialMajor = {{ (selected_major or "") | tojson }};

        const populateMajors = (year, preset) => {
          const majors = majorsByYear[year] || [];
          majorSelect.innerHTML = "";
          majors.forEach((m, idx) => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            if ((preset && m === preset) || (!preset && idx === 0)) {
              opt.selected = true;
            }
            majorSelect.appendChild(opt);
          });
        };

        populateMajors(yearSelect.value, initialMajor);
        yearSelect.addEventListener("change", () => {
          populateMajors(yearSelect.value, null);
        });
      </script>
    </body>
    </html>
    """
    years = list(REQUIREMENTS_BY_YEAR.keys())
    selected_year = selected_year or _default_year()
    majors = list(REQUIREMENTS_BY_YEAR.get(selected_year, {}).keys())
    if not majors and years:
        selected_year = _default_year()
        majors = list(REQUIREMENTS_BY_YEAR.get(selected_year, {}).keys())
    if not selected_major and majors:
        selected_major = majors[0]
    return render_template_string(
        template,
        majors=majors,
        results=results,
        csv_payload=csv_payload,
        selected_major=selected_major or (majors[0] if majors else ""),
        summary=summary,
        years=years,
        selected_year=selected_year,
        majors_by_year={y: list(ms.keys()) for y, ms in REQUIREMENTS_BY_YEAR.items()},
    )


@app.route("/", methods=["GET"])
def index():
    return render_form()


@app.route("/audit", methods=["POST"])
def run_audit():
    selected_major = request.form.get("major", "").strip()
    selected_year = request.form.get("year", "").strip() or _default_year()
    req_path = requirement_for_major_year(selected_major or "", selected_year, REQUIREMENTS_BY_YEAR)
    expected_major = selected_major or (req_path.stem if req_path else "")
    file = request.files.get("transcript")

    if not req_path or not req_path.exists():
        flash("Selected major requirements file was not found for that admission year.")
        return render_form(selected_major=selected_major, selected_year=selected_year)
    if not file or not file.filename:
        flash("Please choose a transcript PDF to upload.")
        return render_form(selected_major=selected_major, selected_year=selected_year)

    temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    try:
        file.save(temp_pdf.name)
        transcript = parse_transcript(Path(temp_pdf.name))
        has_transfer_credit = any(
            (c.grade or "").strip().upper().replace("*", "") == "TC"
            for sem in transcript.semesters
            for c in sem.courses
        )
        if has_transfer_credit:
            flash("Transfer credit detected. Degree audit results may be incomplete.")
        reqs = load_requirements(
            req_path, special_dir=Path("requirements/additional_tables"), admission_year=selected_year
        )
        audit_results = audit_transcript(transcript, reqs, expected_major=expected_major)
        summary = compute_credit_summary(transcript, reqs, audit_results)
    except Exception as exc:  # noqa: BLE001
        flash(f"Error while processing: {exc}")
        return render_form(selected_major=selected_major, selected_year=selected_year)
    finally:
        Path(temp_pdf.name).unlink(missing_ok=True)

    csv_data = audit_results_to_csv_string(audit_results, summary=summary)
    b64_csv = base64.b64encode(csv_data.encode("utf-8")).decode("ascii")

    status_order = {"Satisfied": 0, "Pending": 1}
    table_rows = sorted(
        [
            {
                "course_code": res.requirement.course_code,
                "course_name": res.requirement.course_name,
                "credits_required": format_credit(res.requirement.credits_need),
                "min_grade": res.requirement.min_grade,
                "status": res.status,
                "used_courses": "; ".join(res.used_courses),
                "credits_applied": format_credit(res.credits_applied),
                "credits_remaining": format_credit(res.credits_remaining),
                "note": res.note or res.requirement.comments,
            }
            for res in audit_results
        ],
        key=lambda r: (status_order.get(r["status"], 99), r["course_code"]),
    )

    return render_form(
        results=table_rows,
        csv_payload=b64_csv,
        selected_major=selected_major,
        summary=summary,
        selected_year=selected_year,
    )


@app.route("/download", methods=["POST"])
def download():
    data_b64 = request.form.get("data", "")
    filename = request.form.get("filename", "audit_results.csv")
    try:
        csv_bytes = base64.b64decode(data_b64)
    except Exception:
        flash("Could not decode CSV payload.")
        return redirect(url_for("index"))
    return Response(
        csv_bytes,
        headers={
            "Content-Type": "text/csv",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


if __name__ == "__main__":
    app.run(debug=True)
