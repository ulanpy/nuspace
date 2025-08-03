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
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      control.start("visible");
    }
  }, [control, inView]);

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
