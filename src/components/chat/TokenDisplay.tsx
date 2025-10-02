import { TokenStats } from "@/types/chat";
import { CONTEXT_WINDOW } from "@/utils/tokenCounter";

interface TokenDisplayProps {
  stats: TokenStats;
}

export function TokenDisplay({ stats }: TokenDisplayProps) {
  const contextSizeK = CONTEXT_WINDOW / 1024;

  return (
    <div className="text-gray-500 text-sm font-mono mt-2">
      Tokens Total[{stats.total}] Reason[{stats.reason}] Window[{stats.window}] ({stats.percentage}% of {contextSizeK}K)
    </div>
  );
}
