import { ChatMessage, ToolCall } from "@/types/chat";
import { tools } from "./tools";

const OLLAMA_URL = "http://localhost:11434/v1/chat/completions";
const MODEL = "gpt-oss:latest";
const CONTEXT_WINDOW = 4096;

const SYSTEM_PROMPT = `You are a helpful coding assistant that has tools to assist you in coding.

After you request a tool call, you will receive a JSON document with two fields, "status" and "data". Always check the "status" field to know if the call "SUCCEED" or "FAILED". The information you need to respond will be provided under the "data" field. If the called "FAILED", just inform the user and don't try using the tool again for the current response.

When reading Go source code always start counting lines of code from the top of the source code file.

If you get back results from a tool call, do not verify the results.

Reasoning: high`;

export interface StreamCallbacks {
  onContent: (content: string) => void;
  onReasoning: (reasoning: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  console.log("Starting chat stream to:", OLLAMA_URL);
  console.log("Messages:", messages);
  
  try {
    const requestBody = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
          ...(msg.tool_name && { tool_name: msg.tool_name }),
        })),
      ],
      max_tokens: CONTEXT_WINDOW,
      temperature: 0.0,
      top_p: 0.1,
      top_k: 1,
      stream: true,
      tools: tools,
      tool_selection: "auto",
    };
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ollama error response:", errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let inThinkTag = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim() || !line.startsWith("data: ")) continue;
        
        const data = line.slice(6);
        if (data === "[DONE]") {
          callbacks.onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;

          // Handle tool calls
          if (delta.tool_calls && delta.tool_calls.length > 0) {
            callbacks.onToolCall(delta.tool_calls[0]);
          }

          // Handle reasoning content (from Delta.Reasoning field)
          if (delta.reasoning) {
            callbacks.onReasoning(delta.reasoning);
          }

          // Handle regular content
          if (delta.content) {
            // Check for <think> tags
            if (delta.content === "<think>") {
              inThinkTag = true;
              continue;
            }
            if (delta.content === "</think>") {
              inThinkTag = false;
              continue;
            }

            if (inThinkTag) {
              callbacks.onReasoning(delta.content);
            } else {
              callbacks.onContent(delta.content);
            }
          }
        } catch (e) {
          console.error("Error parsing SSE data:", e);
        }
      }
    }

    callbacks.onComplete();
  } catch (error) {
    console.error("Stream error details:", error);
    if (error instanceof TypeError && error.message.includes("fetch")) {
      callbacks.onError(new Error("Cannot connect to Ollama. Make sure Ollama is running at http://localhost:11434"));
    } else {
      callbacks.onError(error as Error);
    }
  }
}
