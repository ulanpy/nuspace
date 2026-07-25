import { cn } from "@/lib/utils";

type SectionVariant = "section" | "compact";

const variantClasses: Record<SectionVariant, string> = {
  section: "py-16 sm:py-20 lg:py-24",
  compact: "py-8 sm:py-10",
};

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: SectionVariant;
  as?: "section" | "div" | "article" | "header" | "footer";
}

function Section({
  className,
  variant = "section",
  as: Component = "section",
  ...props
}: SectionProps) {
  return (
    <Component className={cn(variantClasses[variant], className)} {...props} />
  );
}

export { Section, type SectionVariant };
