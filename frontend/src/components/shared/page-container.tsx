import { cn } from "@/lib/utils";

type MaxWidth = "prose" | "default" | "wide" | "full";
type ContainerPadding = "default" | "dense" | "none";

const maxWidthClasses: Record<MaxWidth, string> = {
  prose: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
  full: "",
};

const paddingClasses: Record<ContainerPadding, string> = {
  default: "py-8",
  dense: "py-2 sm:py-4",
  none: "",
};

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: MaxWidth;
  padding?: ContainerPadding;
  as?: "div" | "main" | "section" | "article" | "header" | "footer";
}

function PageContainer({
  className,
  maxWidth = "default",
  padding = "none",
  as: Component = "div",
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        paddingClasses[padding],
        maxWidth !== "full" && maxWidthClasses[maxWidth],
        className,
      )}
      {...props}
    />
  );
}

export { PageContainer, type MaxWidth, type ContainerPadding };
