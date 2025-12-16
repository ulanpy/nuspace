import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GraduationCap, AlertCircle, ShieldCheck, Eye, EyeOff, FileDown, ListChecks, ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";

import { gradeStatisticsApi } from "../api/gradeStatisticsApi";
import {
  DegreeAuditResponse,
  DegreeAuditCatalogResponse,
  DegreeAuditResultRow,
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
  const [selectedMajor, setSelectedMajor] = useState("");
  const [showReqModal, setShowReqModal] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      if (cached?.major && majors.includes(cached.major)) {
        setSelectedMajor(cached.major);
      } else {
        setSelectedMajor((prev) => (majors.includes(prev) ? prev : majors[0] || ""));
      }
    }
  }, [catalogQuery.data, cachedQuery.data]);

  useEffect(() => {
    if (catalogQuery.data?.years?.length && selectedYear) {
      const yearEntry = catalogQuery.data.years.find((y) => y.year === selectedYear);
      const majors = yearEntry?.majors || [];
      if (!majors.includes(selectedMajor)) {
        setSelectedMajor(majors[0] || "");
      }
    }
  }, [selectedYear, catalogQuery.data, selectedMajor]);

  const auditMutation = useMutation<DegreeAuditResponse, Error, { password: string }>({
    mutationFn: async ({ password }) => {
      if (!selectedYear || !selectedMajor) throw new Error("Please select year and major");
      return await gradeStatisticsApi.runDegreeAuditFromRegistrar({
        year: selectedYear,
        major: selectedMajor,
        username,
        password,
      });
    },
  });

  const requirementsQuery = useQuery({
    queryKey: ["degree-reqs", selectedYear, selectedMajor],
    queryFn: () => gradeStatisticsApi.getDegreeRequirements({ year: selectedYear, major: selectedMajor }),
    enabled: false,
  });

  const currentYearMajors =
    catalogQuery.data?.years.find((y) => y.year === selectedYear)?.majors || [];
  const [statusSort, setStatusSort] = useState<"default" | "satisfied-first" | "pending-first">("default");
  const sortedResults = useMemo(() => {
    const rows = (auditMutation.data || cachedQuery.data)?.results || [];
    if (statusSort === "default") return rows;
    const order =
      statusSort === "satisfied-first" ? { Satisfied: 0, Pending: 1 } : { Pending: 0, Satisfied: 1 };
    return [...rows].sort((a, b) => {
      const av = order[a.status as keyof typeof order] ?? 2;
      const bv = order[b.status as keyof typeof order] ?? 2;
      if (av !== bv) return av - bv;
      return a.course_code.localeCompare(b.course_code);
    });
  }, [auditMutation.data, cachedQuery.data, statusSort]);

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
            We will fetch your transcript from Registrar using your credentials.
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
              <Link to={ROUTES.DEGREE_AUDIT_INFO} className="text-xs text-primary hover:underline">
                How it works
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Fetch your registrar transcript and match it against your degree requirements.
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Major</label>
            <Select
              value={selectedMajor}
              onValueChange={setSelectedMajor}
              disabled={!currentYearMajors.length || catalogQuery.isLoading}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select major" />
              </SelectTrigger>
              <SelectContent>
                {currentYearMajors.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                auditMutation.reset();
              }}
              disabled={!selectedYear || !selectedMajor || !username || catalogQuery.isLoading || auditMutation.isPending}
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
              {auditMutation.error?.message || "Unable to fetch transcript from Registrar. Please check your password."}
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
      </div>

      {(auditMutation.data || cachedQuery.data) && (
        <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">Results</h3>
            {(auditMutation.data || cachedQuery.data)?.summary && (
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="outline">Required: {(auditMutation.data || cachedQuery.data)?.summary?.total_required}</Badge>
                <Badge variant="outline">Applied: {(auditMutation.data || cachedQuery.data)?.summary?.total_applied}</Badge>
                <Badge variant="outline">Remaining: {(auditMutation.data || cachedQuery.data)?.summary?.total_remaining}</Badge>
                <Badge variant="outline">Taken: {(auditMutation.data || cachedQuery.data)?.summary?.total_taken}</Badge>
              </div>
            )}
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="ghost" size="sm" className="gap-1" onClick={handleDownloadCsv} disabled={!(auditMutation.data || cachedQuery.data)?.csv_base64}>
              <FileDown className="h-4 w-4" /> Download CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => {
                setShowReqModal(true);
                if (selectedYear && selectedMajor) {
                  requirementsQuery.refetch();
                }
              }}
              disabled={!selectedYear || !selectedMajor}
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
          }
        }}
        title="Run degree audit"
        className="max-w-lg"
        contentClassName="rounded-3xl"
      >
        <div className="space-y-4">
          <Alert variant="default" className="border-border/60 bg-muted/40">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">We never store your NU Registrar password.</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Your credentials are sent directly to the registrar via our API just to fetch your transcript for this audit.
            </AlertDescription>
          </Alert>

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
                if (!password.trim()) return;
                try {
                  await auditMutation.mutateAsync({ password: password.trim() });
                  setIsAuditModalOpen(false);
                  setPassword("");
                  setShowPassword(false);
                } catch {
                  // keep modal open to show error
                }
              }}
              disabled={
                !selectedYear ||
                !selectedMajor ||
                !username ||
                !password.trim() ||
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
                {selectedMajor || "Major"} · {selectedYear || "Year"}
              </p>
            </div>
            {requirementsQuery.isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
          <div className="max-h-[480px] overflow-auto rounded-lg border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
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
    </div>
  );
}
