import {
  RegisteredCourse,
  TemplateCreatePayload,
  TemplateItemCreatePayload,
  TemplateItemUpdatePayload,
  TemplateResponse,
  TemplateUpdatePayload,
} from "../types";

export const buildTemplateCreatePayload = (registeredCourse: RegisteredCourse): TemplateCreatePayload => {
  const templateItems: TemplateItemCreatePayload[] = registeredCourse.items
    .filter((item) => item.item_name?.trim())
    .map((item) => ({
      item_name: item.item_name.trim(),
      total_weight_pct: item.total_weight_pct ?? null,
    }));

  return {
    course_id: registeredCourse.course.id,
    student_sub: "me",
    template_items: templateItems,
  };
};

export const canShareTemplate = (registeredCourse: RegisteredCourse): boolean => {
  const payload = buildTemplateCreatePayload(registeredCourse);
  return payload.template_items.length > 0;
};

export const buildTemplateUpdatePayload = (registeredCourse: RegisteredCourse): TemplateUpdatePayload => {
  const items: TemplateItemUpdatePayload[] = registeredCourse.items
    .filter((item) => item.item_name?.trim())
    .map((item) => ({
      item_name: item.item_name.trim(),
      total_weight_pct: item.total_weight_pct ?? null,
    }));

  return {
    template_items: items,
  };
};

export const calculateTemplateCoverage = (registeredCourse: RegisteredCourse): number => {
  return registeredCourse.items.reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);
};

export const calculateTemplateWeight = (template: TemplateResponse): number => {
  return template.template_items.reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);
};

export const sortTemplatesByRecency = (templates: TemplateResponse[]): TemplateResponse[] => {
  return [...templates].sort((a, b) => {
    const aTime = new Date(a.template.created_at).getTime();
    const bTime = new Date(b.template.created_at).getTime();
    return bTime - aTime;
  });
};

