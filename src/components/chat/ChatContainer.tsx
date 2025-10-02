import { useState, useEffect, useRef } from "react";
import { ChatMessage as ChatMessageType } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { LatencyDisplay } from "./LatencyDisplay";
import { TokenDisplay } from "./TokenDisplay";
import { streamChat } from "@/utils/ollama";
import { executeToolCall } from "@/utils/tools";
import { calculateTokenStats, CONTEXT_WINDOW } from "@/utils/tokenCounter";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "ollama-chat-history";
const MODEL = "gpt-oss:latest";

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessageType[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>("");
  const [currentReasoning, setCurrentReasoning] = useState<string[]>([]);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [inToolCall, setInToolCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Refs to track accumulated content during streaming (fixes closure race condition)
  const contentAccumulatorRef = useRef<string>("");
  const reasoningAccumulatorRef = useRef<string[]>([]);
  const toolCallFlagRef = useRef<boolean>(false);
  
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAssistantMessage]);

  // Persist messages to localStorage (exclude reasoning from storage)
  useEffect(() => {
    const toStore = messages.map((msg) => ({
      ...msg,
      reasoning: undefined, // Don't persist reasoning
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [messages]);

  const addMessage = (message: Omit<ChatMessageType, "timestamp">) => {
    setMessages((prev) => [...prev, { ...message, timestamp: Date.now() }]);
  };

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      toast({
        title: "Chat cleared",
        description: "All messages have been removed.",
      });
    }
  };

  const processStreamResponse = async (userMessage: string) => {
    setIsStreaming(true);
    setStreamStartTime(Date.now());
    setCurrentAssistantMessage("");
    setCurrentReasoning([]);
    
    // Reset accumulators
    contentAccumulatorRef.current = "";
    reasoningAccumulatorRef.current = [];
    toolCallFlagRef.current = false;

    const conversationMessages: ChatMessageType[] = inToolCall
      ? messages
      : [...messages, { role: "user", content: userMessage, timestamp: Date.now() }];

    if (!inToolCall) {
      setMessages(conversationMessages);
    }

    setInToolCall(false);

    await streamChat(conversationMessages, {
      onContent: (content) => {
        contentAccumulatorRef.current += content;
        setCurrentAssistantMessage((prev) => prev + content);
      },
      onReasoning: (reasoning) => {
        reasoningAccumulatorRef.current.push(reasoning);
        setCurrentReasoning((prev) => [...prev, reasoning]);
      },
      onToolCall: async (toolCall) => {
        // Add tool call message
        const toolCallContent = `Tool call ${toolCall.id}: ${toolCall.function.name}(${JSON.stringify(toolCall.function.arguments)})`;
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: toolCallContent,
            timestamp: Date.now(),
            isToolCall: true,
          },
        ]);

        // Execute tool
        const toolResponse = executeToolCall(
          toolCall.function.name,
          toolCall.function.arguments
        );

        // Add tool response
        setMessages((prev) => [
          ...prev,
          {
            role: "tool",
            content: JSON.stringify(toolResponse, null, 2),
            tool_call_id: toolCall.id,
            tool_name: toolCall.function.name,
            timestamp: Date.now(),
          },
        ]);

        toolCallFlagRef.current = true;
        setInToolCall(true);
      },
      onError: (error) => {
        console.error("Stream error in ChatContainer:", error);
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive",
        });
        setIsStreaming(false);
        setStreamStartTime(null);
        setInToolCall(false);
      },
      onComplete: () => {
        // Use refs to get the accumulated content (fixes closure race condition)
        const finalContent = contentAccumulatorRef.current.trim();
        const finalReasoning = reasoningAccumulatorRef.current.join("");
        
        if (finalContent) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: finalContent,
              reasoning: finalReasoning || undefined,
              timestamp: Date.now(),
            },
          ]);
          setCurrentAssistantMessage("");
          setCurrentReasoning([]);
        }
        setIsStreaming(false);
        setStreamStartTime(null);
      },
    });

    // Check the ref for tool call flag (not the stale closure value)
    if (toolCallFlagRef.current) {
      setTimeout(() => processStreamResponse(""), 500);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    await processStreamResponse(message);
  };

  // Calculate token stats
  const tokenStats = calculateTokenStats(
    messages.filter((m) => m.role !== "system"),
    currentReasoning
  );

  // Check if we need to remove old messages
  useEffect(() => {
    if (tokenStats.window > CONTEXT_WINDOW && messages.length > 1) {
      console.log("Removing old messages to stay within context window");
      setMessages((prev) => prev.slice(2)); // Remove oldest 2 messages (keep system if exists)
    }
  }, [tokenStats.window, messages.length]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0e1a]">
      {/* Header */}
      <div className="border-b border-gray-800 p-4 flex items-center justify-between bg-[#0a0e1a]">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Ollama Chat - Tool Calling</h1>
          <p className="text-sm text-gray-500">Chat with {MODEL}</p>
        </div>
        <div className="flex items-center gap-4">
          {isStreaming && (
            <LatencyDisplay
              startTime={streamStartTime}
              isStreaming={isStreaming}
              model={MODEL}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            disabled={isStreaming || messages.length === 0}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">Start a conversation with {MODEL}</p>
            <p className="text-sm">The assistant has access to file reading, searching, creation, and code editing tools.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}

        {/* Current streaming message */}
        {isStreaming && currentAssistantMessage && (
          <ChatMessage
            message={{
              role: "assistant",
              content: currentAssistantMessage,
              reasoning: currentReasoning.join(""),
              timestamp: Date.now(),
            }}
          />
        )}

        {/* Token stats */}
        {(messages.length > 0 || isStreaming) && (
          <TokenDisplay stats={tokenStats} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}
