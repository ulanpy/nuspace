"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/atoms/modal";
import { SignInCard } from "@/components/molecules/sign-in-card";
import { AssignmentModal } from "./assignment-modal";
import { ConfirmationModal } from "./confirmation-modal";
import { ScheduleDialog } from "./schedule-dialog";
import type { LiveGpaViewModel } from "../hooks/use-live-gpa-view-model";
import { SummaryCards } from "./live-gpa/summary-cards";
import { RegisteredCourseList } from "./live-gpa/registered-course-list";
import { CourseWorkspace } from "./live-gpa/course-workspace";
import { ShareTemplateModal } from "./live-gpa/share-template-modal";
import { TemplateDrawer } from "./live-gpa/template-drawer";
import { CoursesSyncToolbar } from "./live-gpa/courses-sync-toolbar";
import { CoursesContextPanel } from "./live-gpa/courses-context-panel";
import { gradeStatisticsApi } from "../api/grade-statistics-api";
import { useToast } from "@/hooks/use-toast";
import { coursesSurface } from "../constants/dashboard-theme";
import { pickDefaultCourseId } from "../utils/course-summary-utils";
import { cn } from "@/utils/utils";

interface LiveGpaTabProps {
  user: User | null;
  viewModel: LiveGpaViewModel;
}

export function LiveGpaTab({ user, viewModel }: LiveGpaTabProps) {
  const {
    registeredCourses,
    gpaExclusion,
    metrics,
    schedule,
    assignment,
    deletion,
    templates,
    sharing,
    syncCourses,
    syncCoursesFromPdf,
  } = viewModel;

  const { toast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  useEffect(() => {
    if (registeredCourses.length === 0) {
      setSelectedCourseId(null);
      return;
    }
    const stillValid = selectedCourseId != null && registeredCourses.some((c) => c.id === selectedCourseId);
    if (!stillValid) {
      setSelectedCourseId(pickDefaultCourseId(registeredCourses));
    }
  }, [registeredCourses, selectedCourseId]);

  const selectedCourse = useMemo(
    () => registeredCourses.find((course) => course.id === selectedCourseId) ?? null,
    [registeredCourses, selectedCourseId],
  );

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
        setIsImportModalOpen(false);
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Failed to export";
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
      setIsImportModalOpen(false);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Failed to download calendar";
      toast({ title: "Download failed", description: detail, variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const assignmentForm = assignment.form;
  const userEmail = user?.email ?? "";

  return (
    <div className="space-y-6">
      {user && <SummaryCards metrics={metrics} />}

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        className="!bg-transparent !shadow-none border-none max-w-xl"
        contentClassName="[&>div.sticky]:hidden"
      >
        <div className={cn("flex flex-col gap-3 rounded-2xl border p-4", coursesSurface.cardSm)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-lg font-semibold">Export calendar</p>
              <p className="text-sm text-muted-foreground">
                Sync to Google Calendar, or download an .ics file for Apple Calendar, Outlook, and other apps.
                Sync your registrar schedule first.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsImportModalOpen(false)} aria-label="Close">
              ✕
            </Button>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadIcs} disabled={isExporting}>
              {isExporting ? "Working…" : "Download .ics"}
            </Button>
            <Button size="sm" onClick={handleImportToGoogleCalendar} disabled={isExporting}>
              {isExporting ? "Working…" : "Google Calendar"}
            </Button>
          </div>
        </div>
      </Modal>

      <ScheduleDialog
        open={schedule.isOpen}
        onClose={schedule.close}
        schedule={schedule.data}
        meta={schedule.meta}
        isLoading={schedule.loading}
      />

      {assignment.addModal.course && (
        <AssignmentModal
          isOpen={assignment.addModal.isOpen}
          title="Add assignment"
          itemName={assignmentForm.itemName}
          onNameChange={assignmentForm.updateName}
          weightValue={assignmentForm.weight}
          onWeightChange={assignmentForm.updateWeight}
          maxValue={assignmentForm.max}
          onMaxChange={assignmentForm.updateMax}
          obtainedValue={assignmentForm.obtained}
          onObtainedChange={assignmentForm.updateObtained}
          nameError={assignmentForm.nameError}
          weightError={assignmentForm.weightError}
          maxError={assignmentForm.maxError}
          obtainedError={assignmentForm.obtainedError}
          infoMessage={assignmentForm.infoMessage}
          onCancel={assignment.addModal.close}
          onSubmit={assignment.addModal.submit}
          submitLabel="Add Assignment"
          isSubmitDisabled={!assignmentForm.isValid}
        />
      )}

      {assignment.editModal.item && (
        <AssignmentModal
          isOpen={!!assignment.editModal.item}
          title="Edit assignment"
          itemName={assignmentForm.itemName}
          onNameChange={assignmentForm.updateName}
          weightValue={assignmentForm.weight}
          onWeightChange={assignmentForm.updateWeight}
          maxValue={assignmentForm.max}
          onMaxChange={assignmentForm.updateMax}
          obtainedValue={assignmentForm.obtained}
          onObtainedChange={assignmentForm.updateObtained}
          nameError={assignmentForm.nameError}
          weightError={assignmentForm.weightError}
          maxError={assignmentForm.maxError}
          obtainedError={assignmentForm.obtainedError}
          infoMessage={assignmentForm.infoMessage}
          onCancel={assignment.editModal.close}
          onSubmit={assignment.editModal.submit}
          submitLabel="Save"
          isSubmitDisabled={!assignmentForm.isValid}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletion.item}
        onClose={deletion.cancel}
        onConfirm={deletion.confirm}
        title="Delete assignment"
        description={
          deletion.item
            ? `Are you sure you want to delete "${deletion.item.item_name}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
      />

      {sharing.course && <ShareTemplateModal sharing={sharing} onClose={sharing.close} />}

      <TemplateDrawer
        templates={templates}
        onLoadMore={templates.loadMore}
        onImport={templates.importTemplate}
      />

      {!user ? (
        <SignInCard
          icon={<Calculator className="h-6 w-6" aria-hidden="true" />}
          title="Sign in to track your courses"
          description="We will save your course progress in your account."
        />
      ) : registeredCourses.length === 0 ? (
        <div className={cn("rounded-lg p-6 text-center text-sm text-muted-foreground", coursesSurface.cardLg)}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calculator className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Your course list is empty</h2>
          <p className="mt-1">Sync your schedule to add registered courses.</p>
          <div className="mx-auto mt-6 max-w-md">
            <CoursesSyncToolbar
              viewModel={{ syncCourses, syncCoursesFromPdf, schedule }}
              userEmail={userEmail}
              onImportCalendar={() => setIsImportModalOpen(true)}
              isExporting={isExporting}
              showCalendar={false}
              plain
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px] xl:items-start">
          <div className="order-2 min-w-0 xl:order-1 xl:sticky xl:top-4">
            <RegisteredCourseList
              courses={registeredCourses}
              gpaExclusion={gpaExclusion}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
              footer={
                <CoursesSyncToolbar
                  embedded
                  viewModel={{ syncCourses, syncCoursesFromPdf, schedule }}
                  userEmail={userEmail}
                  onImportCalendar={() => setIsImportModalOpen(true)}
                  isExporting={isExporting}
                />
              }
            />
          </div>

          <div className="order-1 min-w-0 xl:order-2">
            <CourseWorkspace
              course={selectedCourse}
              isExcludedFromGpa={selectedCourse?.isExcludedFromGpa ?? false}
              onAddItem={() => selectedCourse && assignment.addModal.open(selectedCourse.id)}
              onDeleteItem={deletion.request}
              onEditItem={assignment.editModal.open}
              onShareTemplate={() => selectedCourse && sharing.open(selectedCourse)}
              onOpenTemplates={() => selectedCourse && templates.open(selectedCourse)}
              onToggleGpaExclusion={() => selectedCourse && gpaExclusion.toggle(selectedCourse.id)}
            />
          </div>

          <aside className="order-3 min-w-0 xl:order-3 xl:sticky xl:top-4">
            <CoursesContextPanel
              selectedCourse={selectedCourse}
              schedule={schedule.data}
              isExcludedFromGpa={selectedCourse?.isExcludedFromGpa ?? false}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
