"use client";

import { useState, useEffect } from 'react';

const ELECTION_START_DATE = new Date('2026-04-06T09:00:00');
const ELECTION_END_DATE = new Date('2026-04-06T21:00:00');

const calculateCountdown = () => {
  const now = new Date().getTime();
  const differenceToStart = ELECTION_START_DATE.getTime() - now;
  const differenceToEnd = ELECTION_END_DATE.getTime() - now;

  let targetDate = ELECTION_START_DATE;
  let difference = differenceToStart;

  if (differenceToStart < 0) {
    targetDate = ELECTION_END_DATE;
    difference = differenceToEnd;
  }

  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isElectionStarted: differenceToStart < 0,
      isElectionEnded: differenceToEnd < 0,
    };
  }
  return { days: 0, hours: 0, minutes: 0, seconds: 0, isElectionStarted: true, isElectionEnded: true };
};

export function useElectionCountdown() {
  const [countdown, setCountdown] = useState(calculateCountdown());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const interval = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { ...countdown, isClient };
}
