"use client";

import { RefreshCw } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  calculateTemplateCoverage,
  calculateTemplateWeight,
} from "../../utils/template-utils";
import type { LiveGpaViewModel } from "../../hooks/use-live-gpa-view-model";
import type { TemplateResponse } from "../../types";

interface TemplateDrawerProps {
  templates: LiveGpaViewModel["templates"];
  onLoadMore: () => Promise<void>;
  onImport: (template: TemplateResponse) => Promise<void>;
}

export function TemplateDrawer({ templates, onLoadMore, onImport }: TemplateDrawerProps) {
  return (
    <Drawer
      open={templates.isOpen}
      onOpenChange={(open) => !open && templates.close()}
      direction="right"
    >
      <DrawerContent className="flex h-full max-h-none w-full flex-col data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader className="shrink-0 space-y-2 text-left">
          <DrawerTitle className="text-lg font-semibold">Import from classmate</DrawerTitle>
          <DrawerDescription>
            {templates.course?.course.course_code}
            {templates.course?.section ? ` · ${templates.course.section}` : ""}
            {" · "}
            Copy their assignment names and weights into your course.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
          {templates.course && (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
              <div className="font-semibold text-foreground">
                {templates.course.course.title || templates.course.course.course_code}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-center text-xs text-muted-foreground">
                <SummaryTile label="Assignments" value={templates.course.items.length} />
                <SummaryTile
                  label="Coverage"
                  value={`${Math.min(100, Math.max(0, calculateTemplateCoverage(templates.course))).toFixed(1)}%`}
                />
              </div>
            </div>
          )}

          {templates.isInitialFetch ? (
            <SkeletonList />
          ) : templates.templates.length > 0 ? (
            <div className="space-y-3">
              {templates.templates.map((template) => (
                <TemplateCard
                  key={template.template.id}
                  template={template}
                  isImporting={templates.importingTemplateId === template.template.id}
                  onImport={onImport}
                />
              ))}

              <Button variant="outline" className="w-full" onClick={onLoadMore} disabled={templates.isLoading}>
                {templates.isLoading ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-muted/15 p-6 text-center">
      <p className="text-sm font-medium text-foreground">Nothing shared yet</p>
      <p className="text-xs text-muted-foreground">
        When classmates share their grading setup, you can import it here.
      </p>
    </div>
  );
}

function TemplateCard({
  template,
  isImporting,
  onImport,
}: {
  template: TemplateResponse;
  isImporting: boolean;
  onImport: (template: TemplateResponse) => Promise<void>;
}) {
  const coverage = Math.min(100, Math.max(0, calculateTemplateWeight(template))).toFixed(1);
  const createdAt = new Date(template.template.created_at);
  const initials =
    `${template.student.name?.charAt(0) ?? ""}${template.student.surname?.charAt(0) ?? ""}`.toUpperCase() || "P";

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={template.student.picture} alt={`${template.student.name} ${template.student.surname}`} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {template.student.name} {template.student.surname}
            </p>
            <p className="text-xs text-muted-foreground">Shared on {createdAt.toLocaleDateString()}</p>
          </div>
        </div>
        <Button size="sm" className="flex items-center gap-2" onClick={() => onImport(template)} disabled={isImporting}>
          {isImporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Import"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
        <SummaryTile label="Items" value={template.template_items.length} />
        <SummaryTile label="Coverage" value={`${coverage}%`} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Assignments preview</p>
        <div className="space-y-1">
          {template.template_items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-3 py-2"
            >
              <span className="line-clamp-1 text-sm font-medium text-foreground">{item.item_name}</span>
              <span className="text-xs text-muted-foreground">{(item.total_weight_pct ?? 0).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        {template.template_items.length > 4 && (
          <p className="text-xs text-muted-foreground">
            +{template.template_items.length - 4} more items included
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
