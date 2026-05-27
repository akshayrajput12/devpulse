"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface TimelineContentProps {
  children: React.ReactNode;
  animationNum: number;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  customVariants?: {
    visible: (i: number) => any;
    hidden: any;
  };
  className?: string;
  as?: any;
}

export function TimelineContent({
  children,
  animationNum,
  timelineRef,
  customVariants,
  className,
  as = "div",
}: TimelineContentProps) {
  const internalRef = useRef(null);
  const isInView = useInView(timelineRef || internalRef, { once: true, margin: "-10% 0px" });

  const defaultRevealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.25,
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
    hidden: {
      filter: "blur(8px)",
      y: 30,
      opacity: 0,
    },
  };

  const variants = customVariants || defaultRevealVariants;
  const MotionComponent = motion(as);

  return (
    <MotionComponent
      ref={internalRef}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={animationNum}
      variants={variants}
      className={className}
    >
      {children}
    </MotionComponent>
  );
}
