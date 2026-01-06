"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { AssignmentModal } from './assignment-modal';
import { ConfirmationModal } from './confirmation-modal';
import { ScheduleDialog } from './schedule-dialog';
import { SynchronizeCoursesControl } from './synchronize-courses-control';
import type { LiveGpaViewModel } from '../hooks/use-live-gpa-view-model';
import { SummaryCards } from './live-gpa/summary-cards';
import { RegisteredCourseList } from './live-gpa/registered-course-list';
import { ShareTemplateModal } from './live-gpa/share-template-modal';
import { TemplateDrawer } from './live-gpa/template-drawer';
import { gradeStatisticsApi } from '../api/grade-statistics-api';
import { useToast } from "@/hooks/use-toast";
import GoogleCalendarIcon from "@/assets/svg/google_calendar_icon.svg";

interface LiveGpaTabProps {
  user: { email?: string | null } | null;
  login: () => void;
  viewModel: LiveGpaViewModel;
}

export function LiveGpaTab({ user, login, viewModel }: LiveGpaTabProps) {
  const {
    registeredCourses,
    metrics,
    withdraw,
    schedule,
    assignment,
    deletion,
    templates,
    sharing,
    syncCourses,
  } = viewModel;

  const { toast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
      setIsImportModalOpen(false);
    }
  };

  const assignmentForm = assignment.form;
  const userEmail = user?.email ?? "";

  return (
    <div className="space-y-6">
      {user && (
        <>
          <SummaryCards metrics={metrics} />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SynchronizeCoursesControl
              onSync={syncCourses}
              userEmail={userEmail}
            />
            <Button
              size="sm"
              variant="outline"
              className="rounded-full px-4 font-medium gap-2"
              onClick={() => setIsImportModalOpen(true)}
              disabled={isExporting}
            >
              <img src={GoogleCalendarIcon} alt="" className="h-4 w-4" />
              {isExporting ? "Importing…" : "Import to Google Calendar"}
            </Button>
          </div>
        </>
      )}

      {/* Import to Google Calendar Confirmation Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        className="!bg-transparent !shadow-none border-none max-w-xl"
        contentClassName="[&>div.sticky]:hidden"
      >
        <div className="rounded-2xl border border-border/60 bg-background p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">
                Import to Google Calendar
              </p>
              <p className="text-sm text-muted-foreground">
                We will import your registrar schedule to your Google Calendar,
                please make sure to sync your schedule first.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsImportModalOpen(false)}
              aria-label="Close"
              className="h-8 w-8 -mt-1 -mr-1"
            >
              <span className="text-muted-foreground text-lg">✕</span>
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setIsImportModalOpen(false)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportToGoogleCalendar}
              disabled={isExporting}
              size="sm"
              className="h-9 rounded-full px-4 text-sm font-medium"
            >
              {isExporting ? "Importing…" : "Import"}
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
          statusCard={assignmentForm.statusCard}
          onCancel={assignment.addModal.close}
          onSubmit={assignment.addModal.submit}
          submitLabel="Add Item"
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
          statusCard={assignmentForm.statusCard}
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

      {sharing.course && (
        <ShareTemplateModal sharing={sharing} onClose={sharing.close} />
      )}

      <TemplateDrawer
        templates={templates}
        onLoadMore={templates.loadMore}
        onImport={templates.importTemplate}
      />

      {!user ? (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Sign in to track your course progress this semester.
            </p>
            <p className="text-xs text-muted-foreground">
              We will save your course progress for you in your account.
            </p>
          </div>
          <Button
            onClick={login}
            size="sm"
            className="h-8 rounded-full px-3 text-xs font-medium"
          >
            Login
          </Button>
        </div>
      ) : (
        <>
          {registeredCourses.length > 0 ? (
            <RegisteredCourseList
              courses={registeredCourses}
              withdraw={withdraw}
              onAddItem={assignment.addModal.open}
              onDeleteItem={deletion.request}
              onEditItem={assignment.editModal.open}
              onShareTemplate={sharing.open}
              onOpenTemplates={templates.open}
            />
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Calculator className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>
                No courses registered yet. Use the Synchronize button to import
                your schedule.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
