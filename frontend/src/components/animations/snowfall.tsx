"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";

import "./snowfall.css";

type Snowflake = {
  id: number;
  size: number;
  startX: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
};

const FLAKE_COUNT = 25;

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export function Snowfall() {
  const flakes = useMemo<Snowflake[]>(() => {
    return Array.from({ length: FLAKE_COUNT }, (_, idx) => ({
      id: idx,
      size: randomBetween(3, 8),
      startX: randomBetween(0, 100),
      duration: randomBetween(10, 22),
      delay: randomBetween(0, 8),
      opacity: randomBetween(0.3, 0.9),
      drift: randomBetween(-4, 4),
    }));
  }, []);

  return (
    <div className="snowfall-container" aria-hidden="true">
      {flakes.map((flake) => {
        const style: CSSProperties = {
          width: `${flake.size}px`,
          height: `${flake.size}px`,
          left: `${flake.startX}%`,
          animationDuration: `${flake.duration}s`,
          animationDelay: `${flake.delay}s`,
          opacity: flake.opacity,
          ["--snow-drift" as "--snow-drift"]: `${flake.drift}vw`,
        };

        return <span key={flake.id} className="snowflake" style={style} />;
      })}
    </div>
  );
}
