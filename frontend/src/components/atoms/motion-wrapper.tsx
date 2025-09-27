"use client";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect, ReactNode, useState } from "react";

const boxVariant = {
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  hidden: { opacity: 0, y: 20 }
};

interface MotionWrapperProps {
  children: ReactNode;
}

const MotionWrapper = ({ children }: MotionWrapperProps) => {
  const [disableAnimation, setDisableAnimation] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      setDisableAnimation(true);
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMiniApp = Boolean((window as any)?.Telegram?.WebApp);

    setDisableAnimation(prefersReducedMotion || (isMobileBrowser && !isMiniApp));
  }, []);

  const control = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0,
    rootMargin: "0px 0px -10% 0px",
    skip: disableAnimation,
  });

  useEffect(() => {
    if (!disableAnimation && inView) {
      control.start("visible");
    }
  }, [control, disableAnimation, inView]);

  useEffect(() => {
    if (disableAnimation) {
      return;
    }

    const onPageShow = (event: Event) => {
      const pt = event as unknown as { persisted?: boolean };
      if (pt && pt.persisted) {
        control.start("visible");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [control, disableAnimation]);

  const initialVariant = disableAnimation ? "visible" : "hidden";
  const animateVariant = disableAnimation ? "visible" : control;

  return (
    <motion.div
      ref={disableAnimation ? undefined : ref}
      variants={boxVariant}
      initial={initialVariant}
      animate={animateVariant}
      style={disableAnimation ? { opacity: 1, transform: "none" } : { willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
};

export default MotionWrapper;
