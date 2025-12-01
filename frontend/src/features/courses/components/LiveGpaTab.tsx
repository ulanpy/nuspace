import { Calculator } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { AssignmentModal } from "./AssignmentModal";
import { ConfirmationModal } from "./ConfirmationModal";
import { ScheduleDialog } from "./ScheduleDialog";
import { SynchronizeCoursesControl } from "./SynchronizeCoursesControl";
import type { LiveGpaViewModel } from "../hooks/useLiveGpaViewModel";
import { SummaryCards } from "./live-gpa/SummaryCards";
import { RegisteredCourseList } from "./live-gpa/RegisteredCourseList";
import { ShareTemplateModal } from "./live-gpa/ShareTemplateModal";
import { TemplateDrawer } from "./live-gpa/TemplateDrawer";

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

  const assignmentForm = assignment.form;
  const userEmail = user?.email ?? "";

  return (
    <div className="space-y-6">
      {user && (
        <>
          <SummaryCards metrics={metrics} />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SynchronizeCoursesControl onSync={syncCourses} userEmail={userEmail} />
            <Button
              size="sm"
              variant="outline"
              className="rounded-full px-4 font-medium"
              onClick={schedule.open}
              disabled={schedule.loading}
            >
              {schedule.loading ? "Opening…" : "Open calendar"}
            </Button>
          </div>
        </>
      )}

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

      {sharing.course && <ShareTemplateModal sharing={sharing} onClose={sharing.close} />}

      <TemplateDrawer
        templates={templates}
        onLoadMore={templates.loadMore}
        onImport={templates.importTemplate}
      />

      {!user ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
          <div className="text-sm text-muted-foreground">
            Login to track your course progress this semester.
          </div>
          <Button onClick={login} size="sm" className="h-8 rounded-full px-3 text-xs font-medium">
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
              <p>No courses registered yet. Use the Synchronize button to import your schedule.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

