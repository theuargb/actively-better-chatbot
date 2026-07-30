import { getSession } from "auth/server";
import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { customModelProvider } from "lib/ai/models";
import globalLogger from "logger";
import {
  buildCurrentDateSystemPrompt,
  buildUserSystemStaticPrompt,
} from "lib/ai/prompts";
import { getUserPreferences } from "lib/user/server";
import { getAiRateLimiter } from "lib/ai/rate-limit";
import { buildRateLimitMessage } from "lib/ai/rate-limit-message";
import { getUserPlanCode, parseRoles } from "lib/ai/rate-limit-context";

import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Temporary Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, chatModel, instructions } = json as {
      messages: UIMessage[];
      chatModel?: { provider: string; model: string };
      instructions?: string;
    };
    const resolvedModel = customModelProvider.resolveModel(chatModel);
    const isUserMessage = messages.at(-1)?.role === "user";
    const rateLimiter = getAiRateLimiter();
    if (isUserMessage && rateLimiter) {
      const rateLimitResult = await rateLimiter.check({
        userId: session.user.id,
        roles: parseRoles((session.user as { role?: string }).role),
        planCode: await getUserPlanCode(session.user.id),
        model: resolvedModel.identity,
      });
      if (!rateLimitResult.ok) {
        const message = buildRateLimitMessage(rateLimitResult);
        return new Response(message, {
          status: 429,
          headers: { "Retry-After": `${rateLimitResult.retryAfterSeconds}` },
        });
      }
    }

    logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);
    const model = resolvedModel.model;
    const userPreferences =
      (await getUserPreferences(session.user.id)) || undefined;

    return streamText({
      model,
      system: [
        buildUserSystemStaticPrompt(session.user, userPreferences),
        instructions,
      ]
        .filter(Boolean)
        .join("\n\n"),
      messages: [
        { role: "system", content: buildCurrentDateSystemPrompt() },
        ...convertToModelMessages(messages),
      ],
      experimental_transform: smoothStream({ chunking: "word" }),
    }).toUIMessageStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}
