import { query } from "@anthropic-ai/claude-agent-sdk";

export function extractJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1].trim() : raw.trim();
}

export async function runQuery(prompt: string): Promise<string> {
  let result = "";
  for await (const message of query({ prompt, options: { allowedTools: [] } })) {
    if ("result" in message) result = message.result;
  }
  return result;
}
