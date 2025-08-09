import { motion } from "framer-motion";
import { Card } from "../atoms/card";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  hasFloatingBackground?: boolean;
  backgroundEffects?: ReactNode;
  variants?: any;
  className?: string;
  [key: string]: any;
}

export function AnimatedCard({ 
  children, 
  hasFloatingBackground = false, 
  backgroundEffects,
  variants,
  className = "",
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.div variants={variants} className="relative">
      <Card 
        className={`relative transition-all duration-300 ${className}`} 
        {...props}
      >
        {hasFloatingBackground && (
          <div className="absolute inset-0 pointer-events-none">
            {backgroundEffects}
          </div>
        )}
        <div className="relative z-10">
          {children}
        </div>
      </Card>
    </motion.div>
  );
}