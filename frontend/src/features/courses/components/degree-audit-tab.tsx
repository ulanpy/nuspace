"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GraduationCap, AlertCircle, ShieldCheck, Eye, EyeOff, FileDown, ListChecks, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/data/routes";

import { gradeStatisticsApi } from '../api/grade-statistics-api';
import {
  DegreeAuditResponse,
  DegreeAuditCatalogResponse,
  DegreeAuditResultRow,
  DegreeAuditTCCourse,
  DegreeAuditTCMapping,
} from "../types";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/atoms/alert";
import { Badge } from "@/components/atoms/badge";
import { Switch } from "@/components/atoms/switch";
import { cn } from "@/utils/utils";
import { Modal } from "@/components/atoms/modal";

type DegreeAuditTabProps = {
  user: { email?: string | null } | null;
  login: () => void;
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;

type TcMappingRowState = {
  key: string;
  originalCode: string;
  originalTitle: string;
  mappedCode: string;
  mappedCredits: string;
};

type PendingAuditState =
  | { mode: "registrar"; password: string }
  | { mode: "pdf"; pdfFile: File };

function unmappedTcToRows(courses: DegreeAuditTCCourse[]): TcMappingRowState[] {
  return courses.map((row, i) => ({
    key: `${i}-${row.code}-${row.title}`,
    originalCode: row.code,
    originalTitle: row.title,
    mappedCode: "",
    mappedCredits: String(row.credits),
  }));
}

function rowsToTcMappings(rows: TcMappingRowState[]): DegreeAuditTCMapping[] {
  return rows
    .filter((r) => r.mappedCode.trim())
    .map((r) => ({
      original_code: r.originalCode,
      mapped_code: r.mappedCode.trim(),
      mapped_credits: Number.parseFloat(String(r.mappedCredits).replace(",", ".")) || 0,
    }));
}

export function DegreeAuditTab({ user, login }: DegreeAuditTabProps) {
  const username = useMemo(() => {
    const email = user?.email || "";
    const [name] = email.split("@");
    return name || "";
  }, [user]);

  const catalogQuery = useQuery<DegreeAuditCatalogResponse>({
    queryKey: ["degree-audit-catalog"],
    queryFn: gradeStatisticsApi.getDegreeAuditCatalog,
  });

  const cachedQuery = useQuery<DegreeAuditResponse | null>({
    queryKey: ["degree-audit-cached"],
    queryFn: () => gradeStatisticsApi.getDegreeAuditStored(),
  });

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMajors, setSelectedMajors] = useState<string[]>([""]);
  const [selectedMinors, setSelectedMinors] = useState<string[]>([]);
  const [activeAuditIndex, setActiveAuditIndex] = useState<number>(0);
  const [showReqModal, setShowReqModal] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usePdfUpload, setUsePdfUpload] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [tcModalOpen, setTcModalOpen] = useState(false);
  const [pendingAudit, setPendingAudit] = useState<PendingAuditState | null>(null);
  const [tcMappingRows, setTcMappingRows] = useState<TcMappingRowState[]>([]);

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Invalid file result"));
          return;
        }
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (catalogQuery.data?.years?.length) {
      // Prefer cached result to set defaults
      const cached = cachedQuery.data;
      if (cached?.year) {
        setSelectedYear(cached.year);
      } else {
        const firstYear = catalogQuery.data.years[0];
        setSelectedYear((prev) => prev || firstYear.year);
      }
      const targetYear = cached?.year || catalogQuery.data.years[0]?.year;
      const majors = catalogQuery.data.years.find((y) => y.year === targetYear)?.majors || [];
      
      if (cached?.majors?.length) {
        setSelectedMajors(cached.majors.filter((m) => majors.includes(m)));
      } else {
        setSelectedMajors((prev) => (majors.includes(prev[0]) ? prev : [majors[0] || ""]));
      }

      if (cached?.minors?.length) {
        const validMinors = catalogQuery.data.minors || [];
        setSelectedMinors(cached.minors.filter((m) => validMinors.includes(m)));
      }
    }
  }, [catalogQuery.data, cachedQuery.data]);

  useEffect(() => {
    if (catalogQuery.data?.years?.length && selectedYear) {
      const yearEntry = catalogQuery.data.years.find((y) => y.year === selectedYear);
      const majors = yearEntry?.majors || [];
      setSelectedMajors((prev) => {
        const valid = prev.filter((m) => majors.includes(m));
        if (valid.length === 0) return [majors[0] || ""];
        return valid;
      });
    }
  }, [selectedYear, catalogQuery.data]);

  const auditMutation = useMutation<
    DegreeAuditResponse,
    Error,
    | { mode: "registrar"; password: string; tc_mappings?: DegreeAuditTCMapping[] }
    | { mode: "pdf"; pdfFile: File; tc_mappings?: DegreeAuditTCMapping[] }
  >({
    mutationFn: async (payload) => {
      const validMajors = selectedMajors.filter(Boolean);
      const validMinors = selectedMinors.filter(Boolean);
      if (!selectedYear || !validMajors.length) throw new Error("Please select year and at least one major");
      const tc = payload.tc_mappings?.length ? payload.tc_mappings : undefined;
      if (payload.mode === "pdf") {
        const pdfBase64 = await readFileAsBase64(payload.pdfFile);
        return await gradeStatisticsApi.runDegreeAuditFromPdf({
          year: selectedYear,
          majors: validMajors,
          minors: validMinors,
          pdf_file: pdfBase64,
          tc_mappings: tc,
        });
      }
      return await gradeStatisticsApi.runDegreeAuditFromRegistrar({
        year: selectedYear,
        majors: validMajors,
        minors: validMinors,
        username,
        password: payload.password,
        tc_mappings: tc,
      });
    },
  });

  const patchTcMappingRow = (key: string, partial: Partial<Omit<TcMappingRowState, "key">>) => {
    setTcMappingRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...partial } : r)));
  };

  const hasTcMappingInput = useMemo(
    () => tcMappingRows.some((r) => r.mappedCode.trim()),
    [tcMappingRows],
  );

  const activeAudit = useMemo(() => {
    const audits = (auditMutation.data || cachedQuery.data)?.audits || [];
    return audits[activeAuditIndex] || audits[0] || null;
  }, [auditMutation.data, cachedQuery.data, activeAuditIndex]);

  const requirementsQuery = useQuery({
    queryKey: ["degree-reqs", selectedYear, activeAudit?.name, activeAudit?.type],
    queryFn: () => gradeStatisticsApi.getDegreeRequirements({ 
      year: selectedYear, 
      name: activeAudit?.name || "", 
      type: activeAudit?.type || "major" 
    }),
    enabled: false,
  });

  const currentYearMajors =
    catalogQuery.data?.years.find((y) => y.year === selectedYear)?.majors || [];
  const currentMinors = catalogQuery.data?.minors || [];
  const [statusSort, setStatusSort] = useState<"default" | "satisfied-first" | "pending-first">("default");
  
  const sortedResults = useMemo(() => {
    const rows = activeAudit?.results || [];
    if (statusSort === "default") return rows;
    const order =
      statusSort === "satisfied-first" ? { Satisfied: 0, Pending: 1 } : { Pending: 0, Satisfied: 1 };
    return [...rows].sort((a, b) => {
      const av = order[a.status as keyof typeof order] ?? 2;
      const bv = order[b.status as keyof typeof order] ?? 2;
      if (av !== bv) return av - bv;
      return a.course_code.localeCompare(b.course_code);
    });
  }, [activeAudit, statusSort]);

  const handleDownloadCsv = () => {
    const b64 = (auditMutation.data || cachedQuery.data)?.csv_base64;
    if (!b64) return;
    const blob = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "degree_audit.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Sign in to run degree audit.</p>
          <p className="text-xs text-muted-foreground">
            Use registrar credentials or upload a transcript PDF to run the audit.
          </p>
        </div>
        <Button size="sm" onClick={login} className="h-8 rounded-full px-3 text-xs font-medium">
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Degree Audit</p>
              <Link href={ROUTES.DEGREE_AUDIT_INFO} className="text-xs text-primary hover:underline">
                How it works
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Match your transcript against your degree requirements with registrar or PDF upload.
            </p>
          </div>
        </div>

        <Alert variant="default" className="border-amber-300/60 bg-amber-50 text-amber-900">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Important note</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>
              Please note that the output is preliminary and is based on the Academic Handbook provided by the Academic
              Advising Office. The handbook itself may contain inaccuracies, and degree requirements may change over time
              and may not always be fully reflected in it.
            </p>
            <p>
              Therefore, this output should be used as a guiding reference only and not as a final confirmation. Final
              degree completion requirements are confirmed exclusively by Program Directors. We do not take responsibility
              for any discrepancies.
            </p>
            <p>If you notice any errors, please report them to us.</p>
            <p className="font-semibold">
              Best wishes,<br />
              <a href="https://t.me/nu_mri" className="underline" target="_blank" rel="noreferrer">
                SG Ministry of Research and Innovations
              </a>
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Admission year</label>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
              disabled={catalogQuery.isLoading || !catalogQuery.data?.years.length}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {catalogQuery.data?.years.map((y) => (
                  <SelectItem key={y.year} value={y.year}>
                    {y.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Majors</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedMajors((prev) => [...prev, ""])}
              >
                + Add Major
              </Button>
            </div>
            {selectedMajors.map((major, idx) => (
              <div key={`major-${idx}`} className="flex items-center gap-2">
                <Select
                  value={major}
                  onValueChange={(val) => {
                    const newMajors = [...selectedMajors];
                    newMajors[idx] = val;
                    setSelectedMajors(newMajors);
                  }}
                  disabled={!currentYearMajors.length || catalogQuery.isLoading}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={`Major ${idx + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentYearMajors.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMajors.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive flex-shrink-0"
                    onClick={() => {
                      const newMajors = [...selectedMajors];
                      newMajors.splice(idx, 1);
                      setSelectedMajors(newMajors);
                    }}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Minors</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedMinors((prev) => [...prev, ""])}
              >
                + Add Minor
              </Button>
            </div>
            {selectedMinors.map((minor, idx) => (
              <div key={`minor-${idx}`} className="flex items-center gap-2">
                <Select
                  value={minor}
                  onValueChange={(val) => {
                    const newMinors = [...selectedMinors];
                    newMinors[idx] = val;
                    setSelectedMinors(newMinors);
                  }}
                  disabled={!currentMinors.length || catalogQuery.isLoading}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={`Minor ${idx + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentMinors.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive flex-shrink-0"
                  onClick={() => {
                    const newMinors = [...selectedMinors];
                    newMinors.splice(idx, 1);
                    setSelectedMinors(newMinors);
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
            {selectedMinors.length === 0 && (
              <div className="text-xs text-muted-foreground pt-2">No minors added.</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 rounded-full px-3 text-xs font-medium gap-2"
              onClick={() => {
                setIsAuditModalOpen(true);
                setPassword("");
                setShowPassword(false);
                setUsePdfUpload(false);
                setPdfFile(null);
                setPdfError("");
                setTcModalOpen(false);
                setPendingAudit(null);
                setTcMappingRows([]);
                auditMutation.reset();
              }}
              disabled={!selectedYear || !selectedMajors[0] || !username || catalogQuery.isLoading || auditMutation.isPending}
            >
              {auditMutation.isPending ? "Running..." : "Run audit"}
              <GraduationCap className={cn("h-4 w-4", auditMutation.isPending && "animate-spin")} />
            </Button>
          </div>
        </div>

        {auditMutation.isError && (
          <Alert variant="destructive" className="border-destructive/60 bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">Audit failed</AlertTitle>
            <AlertDescription className="text-xs">
              {auditMutation.error?.message ||
                (usePdfUpload
                  ? "Unable to parse the PDF transcript. Please upload a valid NU transcript."
                  : "Unable to fetch transcript from Registrar. Please check your password.")}
            </AlertDescription>
          </Alert>
        )}

        {auditMutation.data?.warnings?.length ? (
          <Alert variant="default" className="border-amber-300/60 bg-amber-50 text-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">Warnings</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              {auditMutation.data.warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        {auditMutation.data?.unmapped_tc_courses && auditMutation.data.unmapped_tc_courses.length > 0 ? (
          <Alert variant="default" className="border-sky-300/60 bg-sky-50/90 text-sky-950">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">Transfer credits (TC)</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>
                Your transcript still has one or more TC lines that are not mapped to an NU course code. TC grades are
                treated as pass, but requirement matching uses course codes. Run the audit again and use the mapping
                step, or leave them as-is if you prefer.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      {(auditMutation.data || cachedQuery.data) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">Results</h3>
            <Select
              value={activeAuditIndex.toString()}
              onValueChange={(val) => setActiveAuditIndex(parseInt(val, 10))}
            >
              <SelectTrigger className="w-auto min-w-[240px] max-w-[400px] h-8 rounded-full text-xs bg-primary text-primary-foreground border-primary hover:bg-primary/90">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(auditMutation.data || cachedQuery.data)?.audits.map((a, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    {a.type === "major" ? "Major" : "Minor"} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeAudit?.summary && (
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="outline">Required: {activeAudit.summary.total_required}</Badge>
                <Badge variant="outline">Applied: {activeAudit.summary.total_applied}</Badge>
                <Badge variant="outline">Remaining: {activeAudit.summary.total_remaining}</Badge>
                <Badge variant="outline">Taken: {activeAudit.summary.total_taken}</Badge>
              </div>
            )}
            <div className="flex gap-2 flex-wrap items-center ml-auto">
              <Button variant="ghost" size="sm" className="gap-1" onClick={handleDownloadCsv} disabled={!(auditMutation.data || cachedQuery.data)?.csv_base64}>
                <FileDown className="h-4 w-4" /> Download CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setShowReqModal(true);
                  if (selectedYear && activeAudit?.name) {
                    requirementsQuery.refetch();
                  }
                }}
                disabled={!selectedYear || !activeAudit?.name}
              >
                <ListChecks className="h-4 w-4" /> View requirements
              </Button>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-border/60">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Course</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2">Req credits</th>
                  <th className="px-3 py-2">Min grade</th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusSort((prev) =>
                          prev === "default" ? "satisfied-first" : prev === "satisfied-first" ? "pending-first" : "default"
                        );
                      }}
                      className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground/80"
                    >
                      <span>Status</span>
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">Used courses</th>
                  <th className="px-3 py-2">Applied</th>
                  <th className="px-3 py-2">Remaining</th>
                  <th className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((row: DegreeAuditResultRow, idx: number) => (
                  <tr key={`${row.course_code}-${row.status}-${idx}`} className="border-t border-border/60">
                    <td className="px-3 py-2 whitespace-nowrap">{row.course_code}</td>
                    <td className="px-3 py-2">{row.course_name}</td>
                    <td className="px-3 py-2 text-center">{row.credits_required}</td>
                    <td className="px-3 py-2 text-center">{row.min_grade}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        variant={row.status === "Satisfied" ? "outline" : "destructive"}
                        className={row.status === "Satisfied" ? "border-emerald-500/50 text-emerald-600" : ""}
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.used_courses}</td>
                    <td className="px-3 py-2 text-center">{row.credits_applied}</td>
                    <td className="px-3 py-2 text-center">{row.credits_remaining}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => {
          if (!auditMutation.isPending) {
            setIsAuditModalOpen(false);
            setPassword("");
            setShowPassword(false);
            setUsePdfUpload(false);
            setPdfFile(null);
            setPdfError("");
          }
        }}
        title="Run degree audit"
        className="max-w-lg"
        contentClassName="rounded-3xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Manual PDF upload</p>
              <p className="text-xs text-muted-foreground">Use a transcript PDF instead of registrar credentials.</p>
            </div>
            <Switch
              checked={usePdfUpload}
              onCheckedChange={(checked) => {
                setUsePdfUpload(checked);
                setPassword("");
                setShowPassword(false);
                setPdfFile(null);
                setPdfError("");
              }}
              disabled={auditMutation.isPending}
            />
          </div>

          {!usePdfUpload && (
            <Alert variant="default" className="border-border/60 bg-muted/40">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">We never store your NU Registrar password.</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                Your credentials are sent directly to the registrar via our API just to fetch your transcript for this audit.
              </AlertDescription>
            </Alert>
          )}

          {!usePdfUpload ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Registrar username</label>
                <Input value={username} readOnly className="cursor-not-allowed bg-muted/60" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Registrar password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    placeholder="Enter your registrar password"
                    className="h-11 rounded-xl pr-10"
                    disabled={auditMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setShowPassword(true);
                    }}
                    onPointerUp={() => setShowPassword(false)}
                    onPointerLeave={() => setShowPassword(false)}
                    onPointerCancel={() => setShowPassword(false)}
                    onBlur={() => setShowPassword(false)}
                    disabled={auditMutation.isPending}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Transcript PDF</label>
              <Input
                type="file"
                accept="application/pdf"
                className="h-11 rounded-xl"
                disabled={auditMutation.isPending}
                onChange={(ev) => {
                  const file = ev.target.files?.[0] || null;
                  if (!file) {
                    setPdfFile(null);
                    setPdfError("");
                    return;
                  }
                  if (file.size > MAX_PDF_BYTES) {
                    setPdfFile(null);
                    setPdfError("File exceeds 10MB. Please upload a smaller PDF.");
                    return;
                  }
                  setPdfError("");
                  setPdfFile(file);
                }}
              />
              <p className="text-xs text-muted-foreground">Upload an unofficial NU transcript PDF (max 10MB).</p>
              {pdfError ? <p className="text-xs text-destructive">{pdfError}</p> : null}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3 text-xs font-medium"
              onClick={() => {
                if (!auditMutation.isPending) {
                  setIsAuditModalOpen(false);
                  setPassword("");
                  setShowPassword(false);
                  setUsePdfUpload(false);
                  setPdfFile(null);
                  setPdfError("");
                }
              }}
              disabled={auditMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-full px-3 text-xs font-medium gap-2"
              onClick={async () => {
                if (usePdfUpload && !pdfFile) return;
                if (!usePdfUpload && !password.trim()) return;
                const pwd = password.trim();
                try {
                  const data: DegreeAuditResponse = usePdfUpload
                    ? await auditMutation.mutateAsync({ mode: "pdf", pdfFile: pdfFile! })
                    : await auditMutation.mutateAsync({ mode: "registrar", password: pwd });
                  const unmapped = data.unmapped_tc_courses ?? [];
                  if (unmapped.length) {
                    if (usePdfUpload) {
                      setPendingAudit({ mode: "pdf", pdfFile: pdfFile! });
                    } else {
                      setPendingAudit({ mode: "registrar", password: pwd });
                    }
                    setTcMappingRows(unmappedTcToRows(unmapped));
                    setTcModalOpen(true);
                  }
                  setIsAuditModalOpen(false);
                  setPassword("");
                  setShowPassword(false);
                  setUsePdfUpload(false);
                  setPdfFile(null);
                  setPdfError("");
                } catch {
                  // keep modal open to show error
                }
              }}
              disabled={
                !selectedYear ||
                !selectedMajors[0] ||
                (!usePdfUpload && (!username || !password.trim())) ||
                (usePdfUpload && (!pdfFile || !!pdfError)) ||
                auditMutation.isPending ||
                catalogQuery.isLoading
              }
            >
              {auditMutation.isPending ? "Running..." : "Run audit"}
              <GraduationCap className={cn("h-4 w-4", auditMutation.isPending && "animate-spin")} />
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={showReqModal}
        onClose={() => setShowReqModal(false)}
        title="Degree requirements"
        className="max-w-4xl"
        contentClassName="rounded-2xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-foreground">
                {activeAudit?.name || "Program"} · {selectedYear || "Year"}
              </p>
            </div>
            {requirementsQuery.isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
          <div className="max-h-[480px] overflow-auto rounded-lg border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="border-border/60 bg-muted sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Course</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-center">Credits</th>
                  <th className="px-3 py-2 text-center">Min grade</th>
                  <th className="px-3 py-2 text-left">Options</th>
                  <th className="px-3 py-2 text-left">Must have</th>
                  <th className="px-3 py-2 text-left">Excepts</th>
                  <th className="px-3 py-2 text-left">Comments</th>
                </tr>
              </thead>
              <tbody>
                {requirementsQuery.data?.length ? (
                  requirementsQuery.data.map((req, idx) => (
                    <tr key={`${req.course_code}-${req.course_name}-${req.min_grade}-${idx}`} className="border-t border-border/60">
                      <td className="px-3 py-2 whitespace-nowrap">{req.course_code}</td>
                      <td className="px-3 py-2">{req.course_name}</td>
                      <td className="px-3 py-2 text-center">{req.credits_need}</td>
                      <td className="px-3 py-2 text-center">{req.min_grade}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{req.options.join("; ")}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{req.must_haves.join("; ")}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{req.excepts.join("; ")}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{req.comments}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={8}>
                      {requirementsQuery.isLoading
                        ? "Loading requirements..."
                        : "No requirements found for the selected year/major."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={tcModalOpen}
        onClose={() => {
          if (!auditMutation.isPending) {
            setTcModalOpen(false);
            setPendingAudit(null);
            setTcMappingRows([]);
          }
        }}
        title="Map transfer credits (TC)"
        className="max-w-3xl"
        contentClassName="rounded-3xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            TC grades are treated as pass. Enter only an NU course code for each transfer line so requirements can match.
            Use department + space + number, for example: HST 152. Lowercase input also works. Leave rows blank to skip
            mapping for that line.
          </p>
          <div className="overflow-auto rounded-xl border border-border/60 max-h-[min(420px,55vh)]">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-[1]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Original course</th>
                  <th className="px-3 py-2 text-left font-medium">NU course</th>
                  <th className="px-3 py-2 text-left font-medium w-[88px]">Credits</th>
                </tr>
              </thead>
              <tbody>
                {tcMappingRows.map((row) => (
                  <tr key={row.key} className="border-t border-border/60 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{row.originalTitle || "—"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{row.originalCode}</div>
                    </td>
                    <td className="px-3 py-2 space-y-1.5">
                      <Input
                        value={row.mappedCode}
                        onChange={(e) => patchTcMappingRow(row.key, { mappedCode: e.target.value })}
                        placeholder="Code, e.g. HST 152"
                        className="h-9 rounded-lg text-xs"
                        disabled={auditMutation.isPending}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.mappedCredits}
                        onChange={(e) => patchTcMappingRow(row.key, { mappedCredits: e.target.value })}
                        inputMode="decimal"
                        className="h-9 rounded-lg text-xs"
                        disabled={auditMutation.isPending}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3 text-xs font-medium"
              onClick={() => {
                if (!auditMutation.isPending) {
                  setTcModalOpen(false);
                  setPendingAudit(null);
                  setTcMappingRows([]);
                }
              }}
              disabled={auditMutation.isPending}
            >
              Skip
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-full px-3 text-xs font-medium gap-2"
              disabled={!pendingAudit || !hasTcMappingInput || auditMutation.isPending}
              onClick={async () => {
                if (!pendingAudit) return;
                const mappings = rowsToTcMappings(tcMappingRows);
                if (!mappings.length) return;
                try {
                  let data: DegreeAuditResponse;
                  if (pendingAudit.mode === "pdf") {
                    data = await auditMutation.mutateAsync({
                      mode: "pdf",
                      pdfFile: pendingAudit.pdfFile,
                      tc_mappings: mappings,
                    });
                  } else {
                    data = await auditMutation.mutateAsync({
                      mode: "registrar",
                      password: pendingAudit.password,
                      tc_mappings: mappings,
                    });
                  }
                  if (data.unmapped_tc_courses?.length) {
                    setTcMappingRows(unmappedTcToRows(data.unmapped_tc_courses));
                  } else {
                    setTcModalOpen(false);
                    setPendingAudit(null);
                    setTcMappingRows([]);
                  }
                } catch {
                  // error surface via auditMutation.isError
                }
              }}
            >
              {auditMutation.isPending ? "Running..." : "Apply and re-run audit"}
              <GraduationCap className={cn("h-4 w-4", auditMutation.isPending && "animate-spin")} />
            </Button>
          </div>
          {auditMutation.isError ? (
            <p className="text-xs text-destructive">
              {auditMutation.error?.message || "Audit failed. Check your transcript or credentials and try again."}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
