"use client";

import { useState, useMemo, useEffect } from "react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCcw, AlertCircle, ShieldCheck, Eye, EyeOff, Upload, ChevronDown } from "lucide-react";
import { RegistrarSyncResponse } from "../types";
import { gradeStatisticsApi } from '../api/grade-statistics-api';
import { getRegistrarErrorMessage } from "@/utils/api";
import { toast } from "@/hooks/toast";
import GoogleCalendarIcon from "@/assets/svg/google_calendar_icon.svg";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
type SyncMode = "registrar" | "pdf";

interface SynchronizeCoursesControlProps {
  onSync: (password: string) => Promise<RegistrarSyncResponse>;
  onSyncPdf: (pdfFileBase64: string) => Promise<RegistrarSyncResponse>;
  userEmail: string;
  openRequestId?: number;
  compact?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",", 2)[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function SynchronizeCoursesControl({
  onSync,
  onSyncPdf,
  userEmail,
  openRequestId,
  compact = false,
}: SynchronizeCoursesControlProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [syncMode, setSyncMode] = useState<SyncMode>("registrar");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncResult, setSyncResult] = useState<RegistrarSyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const usePdfUpload = syncMode === "pdf";

  const username = useMemo(() => {
    if (!userEmail) return "";
    const [name] = userEmail.split("@");
    return name || "";
  }, [userEmail]);

  const handleOpen = (mode: SyncMode = "registrar") => {
    setPassword("");
    setShowPassword(false);
    setSyncMode(mode);
    setPdfFile(null);
    setPdfError("");
    setSyncResult(null);
    setError(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (openRequestId) {
      handleOpen("registrar");
    }
  }, [openRequestId]);

  const handleClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (usePdfUpload && !pdfFile) {
      setError("Schedule PDF is required");
      return;
    }
    if (!usePdfUpload && !password.trim()) {
      setError("Password is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = usePdfUpload
        ? await onSyncPdf(await fileToBase64(pdfFile!))
        : await onSync(password.trim());
      setSyncResult(result);
    } catch (err) {
      console.error("Failed to sync courses", err);
      setError(
        getRegistrarErrorMessage(
          err,
          usePdfUpload
            ? "Failed to sync courses from PDF. Please upload the Registrar Personal Schedule PDF, not Personal Timetable."
            : "Failed to sync courses. Please double-check your password and try again. If the problem persists, please contact us",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportToGoogleCalendar = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await gradeStatisticsApi.exportScheduleToGoogle();
      if (res.google_errors?.includes("insufficient_google_scope")) {
        toast({
          title: "Additional permissions required",
          description: "Please sign in again to grant calendar permissions.",
          variant: "warning",
        });
      } else if (res.google_errors?.length) {
        toast({
          title: "Google Calendar sync completed with issues",
          description: "Some events failed to sync. Please try again.",
          variant: "warning",
        });
      } else {
        toast({
          title: "Synced to Google Calendar",
          description: "Your schedule is up to date.",
          variant: "success",
        });
      }
    } catch (err: unknown) {
      let detail = "Failed to export";
      if (err instanceof Error) {
        detail = err.message;
      }
      toast({ title: "Export failed", description: detail, variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadIcs = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await gradeStatisticsApi.exportScheduleToIcs();
      toast({
        title: "Calendar file downloaded",
        description: "Import schedule.ics into Apple Calendar, Outlook, or any calendar app.",
        variant: "success",
      });
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Failed to download calendar";
      toast({ title: "Download failed", description: detail, variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRevealPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setShowPassword(true);
  };

  const handleRevealPointerUp = () => {
    setShowPassword(false);
  };

  const handleRevealKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setShowPassword(true);
    }
  };

  const handleRevealKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setShowPassword(false);
    }
  };

  return (
    <>
      <div className="inline-flex items-center rounded-lg border border-input">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleOpen("registrar")}
          className="h-8 gap-1.5 rounded-none rounded-l-lg px-3 text-[13px] font-medium"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Sync
        </Button>
        <div className="h-5 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-none rounded-r-lg px-2"
              aria-label="More sync options — sync from PDF"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[11050]">
            <DropdownMenuItem onClick={() => handleOpen("pdf")} className="gap-2">
              <Upload className="h-4 w-4" />
              Sync from file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Sync Nuspace with Registrar"
        className="max-w-lg"
        contentClassName="rounded-3xl"
      >
        <div className="space-y-5">
          {!usePdfUpload && (
            <Alert variant="default" className="border-border/60 bg-muted/40">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">We never store your NU Registrar password.</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                Your credentials are sent directly to the registrar via our API just to fetch your courses and schedule.
              </AlertDescription>
            </Alert>
          )}

          <form action="/registered_courses/sync" method="POST" onSubmit={(ev) => {ev.preventDefault(); handleSubmit()}}>
            {!usePdfUpload ? (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Registrar username</label>
                  <Input value={username} readOnly className="cursor-not-allowed bg-muted/60" />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Registrar password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your registrar password"
                      className="h-11 rounded-xl pr-10"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                      onPointerDown={handleRevealPointerDown}
                      onPointerUp={handleRevealPointerUp}
                      onPointerLeave={handleRevealPointerUp}
                      onPointerCancel={handleRevealPointerUp}
                      onBlur={handleRevealPointerUp}
                      onKeyDown={handleRevealKeyDown}
                      onKeyUp={handleRevealKeyUp}
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Registrar Personal Schedule PDF</label>
                <Input
                  type="file"
                  accept="application/pdf"
                  className="h-11 rounded-xl"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
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
                <p className="text-xs text-muted-foreground">
                  Upload the file titled <span className="font-semibold">Personal Schedule</span> from Registrar.
                  Do not upload <span className="font-semibold">Personal Timetable</span>; it misses data needed for course sync.
                </p>
                {pdfError ? <p className="text-xs text-destructive">{pdfError}</p> : null}
              </div>
            )}

          {error && (
            <Alert variant="destructive" className="my-2 border-destructive/50 bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Synchronization failed</AlertTitle>
              <AlertDescription className="text-xs">
                {error.includes("contact us") ? (
                  <>
                    {error.split("contact us")[0]}
                    <a 
                      href="https://t.me/kamikadze24" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-destructive underline hover:text-destructive/80"
                    >
                      contact us
                    </a>
                  </>
                ) : (
                  error
                )}
              </AlertDescription>
            </Alert>
          )}

          {syncResult && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-xs">
              <h4 className="text-sm font-semibold text-foreground">Synchronization summary</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Total: {syncResult.total_synced}</Badge>
                <Badge variant="outline" className="border-success/50 text-success">
                  Added: {syncResult.added_count}
                </Badge>
                <Badge variant="outline" className="border-primary/50 text-primary">
                  Kept: {syncResult.kept_count}
                </Badge>
                <Badge variant="outline" className="border-warning/50 text-warning">
                  Removed: {syncResult.deleted_count}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Courses will appear in your dashboard immediately.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 my-2">
            {syncResult && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadIcs}
                  disabled={isExporting || isSubmitting}
                  className="rounded-full px-4 font-medium"
                >
                  {isExporting ? "Working…" : "Download .ics"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleImportToGoogleCalendar}
                  disabled={isExporting || isSubmitting}
                  className="rounded-full px-4 font-medium gap-2"
                >
                  <img
                    src={
                      typeof GoogleCalendarIcon === "string"
                        ? GoogleCalendarIcon
                        : GoogleCalendarIcon.src
                    }
                    alt=""
                    className="h-4 w-4"
                  />
                  {isExporting ? "Working…" : "Google Calendar"}
                </Button>
              </div>
            )}
            <Button
              size="sm"
              disabled={
                isSubmitting ||
                (usePdfUpload ? !pdfFile || Boolean(pdfError) : !password.trim())
              }
              className="gap-2"
            >
              <input
                type="submit"
                value={
                  isSubmitting
                    ? "Syncing…"
                    : usePdfUpload
                      ? "Sync from PDF"
                      : "Sync"
                }
              />
              {usePdfUpload ? (
                <Upload className={`h-4 w-4 ${isSubmitting ? "animate-pulse" : ""}`} />
              ) : (
                <RefreshCcw className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
              )}
            </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
