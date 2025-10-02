import { useEffect, useState } from "react";

interface LatencyDisplayProps {
  startTime: number | null;
  isStreaming: boolean;
  model: string;
}

export function LatencyDisplay({ startTime, isStreaming, model }: LatencyDisplayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || !isStreaming) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = (now - startTime) / 1000;
      setElapsed(diff);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, isStreaming]);

  if (!startTime) return null;

  return (
    <div className="text-yellow-500 text-sm font-mono">
      {model} {elapsed.toFixed(3)}
    </div>
  );
}
