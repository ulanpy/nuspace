import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  as?: "h1" | "h2";
}

function PageHeader({
  title,
  subtitle,
  className,
  as: Heading = "h1",
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 max-w-2xl", className)}>
      <Heading className="text-3xl font-bold tracking-tight text-foreground">
        {title}
      </Heading>
      {subtitle && (
        <p className="mt-2 leading-relaxed text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export { PageHeader };
