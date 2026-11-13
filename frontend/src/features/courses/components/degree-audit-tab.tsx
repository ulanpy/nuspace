"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  FileDown,
  ListChecks,
  ArrowUpDown,
  ChevronDown,
  Upload,
  X,
} from "lucide-react";
import Link from "@/router/link";
import { ROUTES } from "@/data/routes";

import { gradeStatisticsApi } from "../api/grade-statistics-api";
import { getRegistrarErrorMessage } from "@/utils/api";
import {
  DegreeAuditResponse,
  DegreeAuditCatalogResponse,
  DegreeAuditResultRow,
  DegreeAuditTCCourse,
  DegreeAuditTCMapping,
} from "../types";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";
import { Modal } from "@/components/shared/modal";
import { SignInCard } from "@/components/molecules/sign-in-card";

type DegreeAuditTabProps = {
  user: { email?: string | null } | null;
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;
type AuditInputMode = "registrar" | "pdf";

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

function getAuditErrorMessage(error: Error | null, usePdfUpload: boolean): string {
  return getRegistrarErrorMessage(
    error,
    usePdfUpload
      ? "Unable to parse the PDF transcript. Please upload a valid NU transcript."
      : "Unable to fetch transcript from Registrar. Please check your password.",
  );
}

export function DegreeAuditTab({ user }: DegreeAuditTabProps) {
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
  const [auditInputMode, setAuditInputMode] = useState<AuditInputMode>("registrar");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [tcModalOpen, setTcModalOpen] = useState(false);
  const [pendingAudit, setPendingAudit] = useState<PendingAuditState | null>(null);
  const [tcMappingRows, setTcMappingRows] = useState<TcMappingRowState[]>([]);
  const usePdfUpload = auditInputMode === "pdf";

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

  const openAuditModal = (mode: AuditInputMode = "registrar") => {
    setIsAuditModalOpen(true);
    setPassword("");
    setShowPassword(false);
    setAuditInputMode(mode);
    setPdfFile(null);
    setPdfError("");
    setTcModalOpen(false);
    setPendingAudit(null);
    setTcMappingRows([]);
    auditMutation.reset();
  };

  const hasResults = Boolean(auditMutation.data || cachedQuery.data);
  const canOpenAudit = !catalogQuery.isLoading && !auditMutation.isPending;
  const canSubmitAudit =
    Boolean(selectedYear && selectedMajors[0]) &&
    !catalogQuery.isLoading &&
    !auditMutation.isPending &&
    (usePdfUpload ? Boolean(pdfFile && !pdfError) : Boolean(username && password.trim()));

  const closeAuditModal = () => {
    if (auditMutation.isPending) return;
    setIsAuditModalOpen(false);
    setPassword("");
    setShowPassword(false);
    setAuditInputMode("registrar");
    setPdfFile(null);
    setPdfError("");
  };
  
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
      <SignInCard
        icon={<GraduationCap className="h-6 w-6" aria-hidden="true" />}
        title="Sign in to run degree audit"
        description="Use registrar credentials or upload a transcript PDF to run the audit."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1.5 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CardTitle className="text-base font-semibold">Degree Audit</CardTitle>
                <Link href={ROUTES.DEGREE_AUDIT_INFO} className="text-xs text-primary hover:underline">
                  How it works
                </Link>
              </div>
              <CardDescription className="mt-1">
                Match your transcript against your degree requirements with registrar or PDF upload.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <Accordion type="single" collapsible className="rounded-lg border border-border">
            <AccordionItem value="disclaimer" className="border-0 px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Important note
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-[13px] leading-relaxed text-muted-foreground">
                <p>
                  Please note that the output is preliminary and is based on the Academic Handbook provided by the
                  Academic Advising Office. The handbook itself may contain inaccuracies, and degree requirements may
                  change over time and may not always be fully reflected in it.
                </p>
                <p>
                  Therefore, this output should be used as a guiding reference only and not as a final confirmation.
                  Final degree completion requirements are confirmed exclusively by Program Directors. We do not take
                  responsibility for any discrepancies.
                </p>
                <p>If you notice any errors, please report them to us.</p>
                <p>
                  Best wishes,
                  <br />
                  <a href="https://t.me/nu_mri" className="font-medium text-foreground" target="_blank" rel="noreferrer">
                    SG Ministry of Research and Innovations
                  </a>
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted-foreground">
              {hasResults
                ? "Run again to refresh against your latest transcript."
                : "One click to start — you'll choose year, major, and transcript next."}
            </p>
            <ButtonGroup aria-label="Run degree audit">
              <Button
                size="sm"
                onClick={() => openAuditModal("registrar")}
                disabled={!canOpenAudit || !username}
              >
                {auditMutation.isPending ? "Running..." : hasResults ? "Run again" : "Run audit"}
                <GraduationCap className={cn(auditMutation.isPending && "animate-spin")} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={!canOpenAudit} aria-label="More audit options">
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openAuditModal("pdf")}>
                    <Upload />
                    Run audit from file
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          </div>

          {auditMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Audit failed</AlertTitle>
              <AlertDescription>
                {getAuditErrorMessage(auditMutation.error, usePdfUpload)}
              </AlertDescription>
            </Alert>
          )}

          {auditMutation.data?.warnings?.length ? (
            <Alert>
              <AlertCircle />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription className="space-y-1">
                {auditMutation.data.warnings.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </AlertDescription>
            </Alert>
          ) : null}

          {auditMutation.data?.unmapped_tc_courses && auditMutation.data.unmapped_tc_courses.length > 0 ? (
            <Alert>
              <AlertCircle />
              <AlertTitle>Transfer credits (TC)</AlertTitle>
              <AlertDescription>
                Your transcript still has one or more TC lines that are not mapped to an NU course code. TC grades are
                treated as pass, but requirement matching uses course codes. Run the audit again and use the mapping
                step, or leave them as-is if you prefer.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {(auditMutation.data || cachedQuery.data) && (
        <Card>
          <CardHeader className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base font-semibold">Results</CardTitle>
              <Select
                value={activeAuditIndex.toString()}
                onValueChange={(val) => setActiveAuditIndex(parseInt(val, 10))}
              >
                <SelectTrigger size="sm" className="w-auto min-w-[200px] max-w-[360px]">
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
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Required: {activeAudit.summary.total_required}</Badge>
                  <Badge variant="outline">Applied: {activeAudit.summary.total_applied}</Badge>
                  <Badge variant="outline">Remaining: {activeAudit.summary.total_remaining}</Badge>
                  <Badge variant="outline">Taken: {activeAudit.summary.total_taken}</Badge>
                </div>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCsv}
                  disabled={!(auditMutation.data || cachedQuery.data)?.csv_base64}
                >
                  <FileDown />
                  Download CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReqModal(true);
                    if (selectedYear && activeAudit?.name) {
                      requirementsQuery.refetch();
                    }
                  }}
                  disabled={!selectedYear || !activeAudit?.name}
                >
                  <ListChecks />
                  View requirements
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-left text-[13px] text-muted-foreground">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 font-medium">Course</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 text-right font-medium tabular-nums">Req credits</th>
                    <th className="px-3 py-2 text-center font-medium">Min grade</th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusSort((prev) =>
                            prev === "default"
                              ? "satisfied-first"
                              : prev === "satisfied-first"
                                ? "pending-first"
                                : "default",
                          );
                        }}
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-foreground/80"
                      >
                        Status
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">Used courses</th>
                    <th className="px-3 py-2 text-right font-medium tabular-nums">Applied</th>
                    <th className="px-3 py-2 text-right font-medium tabular-nums">Remaining</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((row: DegreeAuditResultRow, idx: number) => (
                    <tr key={`${row.course_code}-${row.status}-${idx}`} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">
                        {row.course_code}
                      </td>
                      <td className="px-3 py-2 text-foreground">{row.course_name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.credits_required}</td>
                      <td className="px-3 py-2 text-center">{row.min_grade}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={row.status === "Satisfied" ? "outline" : "destructive"}
                          className={
                            row.status === "Satisfied" ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" : ""
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-[12px]">{row.used_courses}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.credits_applied}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.credits_remaining}</td>
                      <td className="px-3 py-2 text-[12px]">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={closeAuditModal}
        title="Run degree audit"
        description="Choose your program, then connect your transcript."
        className="max-w-lg"
      >
        <div className="space-y-5">
          <section className="space-y-3">
            <p className="text-[13px] font-medium text-foreground">Your program</p>
            <div className="space-y-2">
              <Label htmlFor="admission-year">Admission year</Label>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
                disabled={catalogQuery.isLoading || !catalogQuery.data?.years.length || auditMutation.isPending}
              >
                <SelectTrigger id="admission-year">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Majors</Label>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={auditMutation.isPending}
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
                    disabled={!currentYearMajors.length || catalogQuery.isLoading || auditMutation.isPending}
                  >
                    <SelectTrigger>
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
                      size="icon-sm"
                      className="shrink-0 text-destructive"
                      aria-label={`Remove major ${idx + 1}`}
                      disabled={auditMutation.isPending}
                      onClick={() => {
                        const newMajors = [...selectedMajors];
                        newMajors.splice(idx, 1);
                        setSelectedMajors(newMajors);
                      }}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Minors</Label>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={auditMutation.isPending}
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
                    disabled={!currentMinors.length || catalogQuery.isLoading || auditMutation.isPending}
                  >
                    <SelectTrigger>
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
                    size="icon-sm"
                    className="shrink-0 text-destructive"
                    aria-label={`Remove minor ${idx + 1}`}
                    disabled={auditMutation.isPending}
                    onClick={() => {
                      const newMinors = [...selectedMinors];
                      newMinors.splice(idx, 1);
                      setSelectedMinors(newMinors);
                    }}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {selectedMinors.length === 0 && (
                <p className="text-[13px] text-muted-foreground">Optional — add a minor if you have one.</p>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <p className="text-[13px] font-medium text-foreground">Transcript</p>

            {!usePdfUpload && (
              <Alert>
                <ShieldCheck />
                <AlertTitle>We never store your NU Registrar password</AlertTitle>
                <AlertDescription>
                  Credentials are used only to fetch your transcript for this audit.
                </AlertDescription>
              </Alert>
            )}

            {!usePdfUpload ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="registrar-username">Registrar username</Label>
                  <Input
                    id="registrar-username"
                    value={username}
                    readOnly
                    className="cursor-not-allowed bg-muted/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrar-password">Registrar password</Label>
                  <div className="relative">
                    <Input
                      id="registrar-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      placeholder="Enter your registrar password"
                      className="pr-10"
                      disabled={auditMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1 top-1 text-muted-foreground hover:text-foreground"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setShowPassword(true);
                      }}
                      onPointerUp={() => setShowPassword(false)}
                      onPointerLeave={() => setShowPassword(false)}
                      onPointerCancel={() => setShowPassword(false)}
                      onBlur={() => setShowPassword(false)}
                      disabled={auditMutation.isPending}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="transcript-pdf">Transcript PDF</Label>
                <Input
                  id="transcript-pdf"
                  type="file"
                  accept="application/pdf"
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
                <p className="text-[13px] text-muted-foreground">
                  Upload an unofficial NU transcript PDF (max 10MB).
                </p>
                {pdfError ? <p className="text-[13px] text-destructive">{pdfError}</p> : null}
              </div>
            )}
          </section>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeAuditModal} disabled={auditMutation.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
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
                  closeAuditModal();
                } catch {
                  // keep modal open to show error
                }
              }}
              disabled={!canSubmitAudit}
            >
              {auditMutation.isPending ? "Running..." : "Run audit"}
              <GraduationCap className={cn(auditMutation.isPending && "animate-spin")} />
            </Button>
          </div>

          {auditMutation.isError && isAuditModalOpen ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Audit failed</AlertTitle>
              <AlertDescription>
                {getAuditErrorMessage(auditMutation.error, usePdfUpload)}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </Modal>
      <Modal
        isOpen={showReqModal}
        onClose={() => setShowReqModal(false)}
        title="Degree requirements"
        className="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <p className="font-medium text-foreground">
              {activeAudit?.name || "Program"} · {selectedYear || "Year"}
            </p>
            {requirementsQuery.isLoading && (
              <span className="text-muted-foreground">Loading...</span>
            )}
          </div>
          <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-[13px] text-muted-foreground">
              <thead className="sticky top-0 border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Course</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 text-right font-medium tabular-nums">Credits</th>
                  <th className="px-3 py-2 text-center font-medium">Min grade</th>
                  <th className="px-3 py-2 font-medium">Options</th>
                  <th className="px-3 py-2 font-medium">Must have</th>
                  <th className="px-3 py-2 font-medium">Excepts</th>
                  <th className="px-3 py-2 font-medium">Comments</th>
                </tr>
              </thead>
              <tbody>
                {requirementsQuery.data?.length ? (
                  requirementsQuery.data.map((req, idx) => (
                    <tr
                      key={`${req.course_code}-${req.course_name}-${req.min_grade}-${idx}`}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">
                        {req.course_code}
                      </td>
                      <td className="px-3 py-2 text-foreground">{req.course_name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{req.credits_need}</td>
                      <td className="px-3 py-2 text-center">{req.min_grade}</td>
                      <td className="px-3 py-2 text-[12px]">{req.options.join("; ")}</td>
                      <td className="px-3 py-2 text-[12px]">{req.must_haves.join("; ")}</td>
                      <td className="px-3 py-2 text-[12px]">{req.excepts.join("; ")}</td>
                      <td className="px-3 py-2 text-[12px]">{req.comments}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-[13px] text-muted-foreground" colSpan={8}>
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
      >
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            TC grades are treated as pass. Enter only an NU course code for each transfer line so requirements can match.
            Use department + space + number, for example: HST 152. Lowercase input also works. Leave rows blank to skip
            mapping for that line.
          </p>
          <div className="max-h-[min(420px,55vh)] overflow-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-[13px] text-muted-foreground">
              <thead className="sticky top-0 z-[1] border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Original course</th>
                  <th className="px-3 py-2 font-medium">NU course</th>
                  <th className="w-[88px] px-3 py-2 font-medium">Credits</th>
                </tr>
              </thead>
              <tbody>
                {tcMappingRows.map((row) => (
                  <tr key={row.key} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{row.originalTitle || "—"}</div>
                      <div className="mt-0.5 text-[12px]">{row.originalCode}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Label htmlFor={`tc-code-${row.key}`} className="sr-only">
                        NU course code for {row.originalCode}
                      </Label>
                      <Input
                        id={`tc-code-${row.key}`}
                        value={row.mappedCode}
                        onChange={(e) => patchTcMappingRow(row.key, { mappedCode: e.target.value })}
                        placeholder="Code, e.g. HST 152"
                        disabled={auditMutation.isPending}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Label htmlFor={`tc-credits-${row.key}`} className="sr-only">
                        Credits for {row.originalCode}
                      </Label>
                      <Input
                        id={`tc-credits-${row.key}`}
                        value={row.mappedCredits}
                        onChange={(e) => patchTcMappingRow(row.key, { mappedCredits: e.target.value })}
                        inputMode="decimal"
                        className="tabular-nums"
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
              <GraduationCap className={cn(auditMutation.isPending && "animate-spin")} />
            </Button>
          </div>
          {auditMutation.isError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Audit failed</AlertTitle>
              <AlertDescription>
                {getAuditErrorMessage(
                  auditMutation.error,
                  pendingAudit?.mode === "pdf",
                )}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
