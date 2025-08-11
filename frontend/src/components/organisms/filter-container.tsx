import React from 'react';

interface FilterContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function FilterContainer({ children, className = "", title }: FilterContainerProps) {
  return (
    <div className={`
      bg-background/80 backdrop-blur-sm 
      border border-border/40 
      rounded-xl 
      p-2.5 sm:p-3 
      shadow-sm
      relative z-[1]
      ${className}
    `}>
      {title && (
        <h3 className="text-sm font-medium text-foreground/80 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}