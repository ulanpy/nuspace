# Grade statistics → CSV

Отчёты брать здесь: **[undergraduate grade distribution](https://ie.nu.edu.kz/ira/grade-distribution/undergraduate-grade-distribution/)** (IE / IRA).

```bash
cd backend/modules/courses/csv_parsers
```

## Процесс при выходе новых стат

1. **Очисти** **`pdfs/`** от старых PDF (чтобы не смешивать термы и школы).
2. **Скачай** с сайта по ссылке выше актуальные PDF и положи их в **`pdfs/`**.
3. **Запусти** пайплайн:

```bash
python run_pipeline.py
```

4. Результат — **`csvs/<ТЕРМ>.csv`** в формате **`FA20xx.csv`** или **`SP20xx.csv`** (например `FA2025.csv`). Терм обычно подхватывается из текста PDF; если нет:

```bash
python run_pipeline.py --term FA2025
```

5. **Снова удали** PDF из **`pdfs/`**, когда CSV уже не нужен локально.

Строки без сопоставленного преподавателя пайплайн выводит в **терминал (stderr)**.

## Загрузка CSV в базу

Файл должен лежать в **`csvs/`**; в команде достаточно **basename** (или путь внутри `csvs/`):

```bash
python grade_reports.py FA2025.csv
```

Только анализ дубликатов, без записи в БД:

```bash
python grade_reports.py FA2025.csv --analyze
```

## Нужно на машине

- `pdftotext` (**poppler-utils** / poppler).
- Зависимости проекта и **`PYTHONPATH`** на корень репо (см. блок выше).

## Git

Папка **`pdfs/`** в репозитории пустая (через `.gitkeep`); **`*.pdf`** в ней не коммитятся.
