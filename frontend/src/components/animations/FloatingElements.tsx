import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, Zap } from "lucide-react";
import { useState, useEffect } from "react";

interface FloatingElementsProps {
  count?: number;
  className?: string;
}

export function FloatingElements({ count = 6, className = "" }: FloatingElementsProps) {
  const [elements, setElements] = useState<number[]>([]);

  useEffect(() => {
    const elementArray = Array.from({ length: count }, (_, i) => i);
    setElements(elementArray);
  }, [count]);

  const icons = [Star, Sparkles, Zap];

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <AnimatePresence>
        {elements.map((element, index) => {
          const IconComponent = icons[index % 3];
          return (
            <motion.div
              key={element}
              className="absolute opacity-20"
              style={{
                left: `${15 + (index * 15)}%`,
                top: `${10 + (index * 12)}%`,
              }}
              animate={{
                y: [-20, 20, -20],
                x: [-10, 10, -10],
                rotate: [0, 5, -5, 0],
                opacity: [0.2, 0.5, 0.2]
              }}
              initial={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.5 
              }}
            >
              <IconComponent className={`${
                index % 3 === 0 ? "h-4 w-4" : "h-3 w-3"
              } text-primary${index % 3 === 1 ? "/60" : index % 3 === 2 ? "/40" : ""}`} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}