import type { ComponentPropsWithoutRef, JSX } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownElementProps<T extends keyof JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<T> & { node?: unknown };

const combineClassNames = (...classes: (string | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const markdownComponents: Components = {
  p({ className, ...props }: MarkdownElementProps<"p">) {
    return (
      <p
        {...props}
        className={combineClassNames(
          "text-muted-foreground text-base leading-relaxed whitespace-pre-line break-words",
          className
        )}
      />
    );
  },
  a({ className, ...props }: MarkdownElementProps<"a">) {
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className={combineClassNames("text-primary underline break-words", className)}
      />
    );
  },
  ul({ className, ...props }: MarkdownElementProps<"ul">) {
    return (
      <ul
        {...props}
        className={combineClassNames(
          "list-disc pl-5 text-muted-foreground space-y-1 leading-relaxed",
          className
        )}
      />
    );
  },
  ol({ className, ...props }: MarkdownElementProps<"ol">) {
    return (
      <ol
        {...props}
        className={combineClassNames(
          "list-decimal pl-5 text-muted-foreground space-y-1 leading-relaxed",
          className
        )}
      />
    );
  },
  li({ className, ...props }: MarkdownElementProps<"li">) {
    return (
      <li
        {...props}
        className={combineClassNames("break-words", className)}
      />
    );
  },
  strong({ className, ...props }: MarkdownElementProps<"strong">) {
    return (
      <strong
        {...props}
        className={combineClassNames("font-semibold text-foreground", className)}
      />
    );
  },
  em({ className, ...props }: MarkdownElementProps<"em">) {
    return (
      <em
        {...props}
        className={combineClassNames("italic text-foreground", className)}
      />
    );
  },
  blockquote({ className, ...props }: MarkdownElementProps<"blockquote">) {
    return (
      <blockquote
        {...props}
        className={combineClassNames(
          "border-l-4 pl-4 text-muted-foreground italic",
          className
        )}
      />
    );
  },
};

interface MarkdownContentProps {
  content: string;
  className?: string;
  fallback?: string;
}

export const MarkdownContent = ({
  content,
  className = "space-y-4",
  fallback = "No description provided.",
}: MarkdownContentProps) => {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content || fallback}
      </ReactMarkdown>
    </div>
  );
};
