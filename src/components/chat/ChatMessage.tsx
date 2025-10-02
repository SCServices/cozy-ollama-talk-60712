import { ChatMessage as ChatMessageType } from "@/types/chat";
import { User, Bot, Wrench } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (message.role === "system") {
    return null; // Don't display system messages
  }

  if (message.role === "user") {
    return (
      <div className="flex gap-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">You - {formatTime(message.timestamp)}</div>
          <div className="bg-blue-900/30 rounded-lg p-3 text-gray-100">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    return (
      <div className="flex gap-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <Bot className="w-5 h-5 text-gray-300" />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Assistant - {formatTime(message.timestamp)}</div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            {message.isToolCall ? (
              <div className="text-green-400 font-mono text-sm">
                {message.content}
              </div>
            ) : (
              <>
                <div className="text-gray-100 whitespace-pre-wrap">{message.content}</div>
                {message.reasoning && (
                  <div className="text-red-400 italic mt-2 whitespace-pre-wrap border-l-2 border-red-400/30 pl-3">
                    {message.reasoning}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (message.role === "tool") {
    return (
      <div className="flex gap-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">
            Tool Response - {formatTime(message.timestamp)}
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1 font-mono">
              {message.tool_name} (ID: {message.tool_call_id})
            </div>
            <pre className="text-gray-400 text-sm overflow-x-auto">
              {message.content}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
