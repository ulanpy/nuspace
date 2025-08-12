"use client";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect, ReactNode } from "react";

const boxVariant = {
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  hidden: { opacity: 0, y: 20 }
};

interface MotionWrapperProps {
  children: ReactNode;
}

const MotionWrapper = ({ children }: MotionWrapperProps) => {

  const control = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0,
    // Encourage early trigger even when sticky headers overlap a bit
    rootMargin: "0px 0px -10% 0px",
  });

  useEffect(() => {
    if (inView) {
      control.start("visible");
    }
  }, [control, inView]);

  // Fallback for mobile back/forward cache restoring pages without re-triggering IO
  useEffect(() => {
    const onPageShow = (event: Event) => {
      // Some browsers (iOS Safari) restore from bfcache and skip intersection updates
      // Ensure content is visible in that case
      const pt = event as unknown as { persisted?: boolean };
      if (pt && pt.persisted) {
        control.start("visible");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [control]);

  return (
    <motion.div
      ref={ref}
      variants={boxVariant}
      initial="hidden"
      animate={control}
    >
      {children}
    </motion.div>
  );
};

export default MotionWrapper;
