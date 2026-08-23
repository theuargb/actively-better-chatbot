export type ImageToolProvider = "google" | "openai";
type ToolChoice = "auto" | "none" | "manual";

type ImageToolEnvironment = {
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  OPENAI_API_KEY?: string;
};

export function resolveImageToolProvider(
  environment: ImageToolEnvironment = {
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
): ImageToolProvider | undefined {
  if (environment.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (environment.OPENAI_API_KEY) return "openai";
  return undefined;
}

export function canUseDefaultImageTool({
  supportToolCall,
  toolChoice,
}: {
  supportToolCall: boolean;
  toolChoice: ToolChoice;
}) {
  return supportToolCall && toolChoice !== "none";
}
