import { ArrowDown, ArrowUp } from 'lucide-react';

interface TrendIndicatorProps {
  userScore: number;
  classAverage: number | null | undefined;
}

export function TrendIndicator({ userScore, classAverage }: TrendIndicatorProps) {
  if (classAverage == null) {
    return null;
  }

  const difference = userScore - classAverage;
  const isUp = difference >= 0;
  const colorClass = isUp ? 'text-green-500' : 'text-red-500';
  const Icon = isUp ? ArrowUp : ArrowDown;

  return (
    <div className={`flex items-center justify-center text-xs ${colorClass}`}>
      <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
      <span className="whitespace-nowrap">
        {Math.abs(difference).toFixed(1)}% {isUp ? 'above' : 'below'} avg
      </span>
    </div>
  );
}
