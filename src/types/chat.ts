export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  reasoning?: string;
  tool_call_id?: string;
  tool_name?: string;
  timestamp: number;
  isToolCall?: boolean;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface StreamChunk {
  content?: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
}

export interface TokenStats {
  total: number;
  reason: number;
  window: number;
  percentage: number;
}
