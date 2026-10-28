import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { getSession } from "auth/server";
import { customModelProvider } from "lib/ai/models";
import {
  buildCurrentDateSystemPrompt,
  buildUserSystemStaticPrompt,
} from "lib/ai/prompts";
import { getAiRateLimiter } from "lib/ai/rate-limit";
import { parseRoles } from "lib/ai/rate-limit-context";
import { buildRateLimitMessage } from "lib/ai/rate-limit-message";
import { getUserPreferences } from "lib/user/server";
import globalLogger from "logger";

import { colorize } from "consola/utils";
import { buildModelLockedMessage } from "lib/plan/model-locked-message";
import {
  checkModelAccess,
  getEffectivePlan,
  getLimitOffer,
} from "lib/plan/server";

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
    const effectivePlan = await getEffectivePlan(session.user.id);
    const access = await checkModelAccess(
      session.user.id,
      resolvedModel.identity,
      effectivePlan,
    );
    if (!access.ok) {
      return new Response(
        buildModelLockedMessage({
          model: resolvedModel.identity.model,
          requiredPlan: access.requiredPlan,
        }),
        { status: 403 },
      );
    }
    const rateLimiter = getAiRateLimiter();
    if (isUserMessage && rateLimiter) {
      const roles = parseRoles((session.user as { role?: string }).role);
      const rateLimitResult = await rateLimiter.check({
        userId: session.user.id,
        roles,
        planCode: effectivePlan?.code ?? null,
        model: resolvedModel.identity,
      });
      if (!rateLimitResult.ok) {
        const offer = await getLimitOffer(
          { plan: effectivePlan, roles, model: resolvedModel.identity },
          rateLimitResult.window,
          rateLimitResult.limit,
        );
        const message = buildRateLimitMessage({ ...rateLimitResult, offer });
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
      abortSignal: request.signal,
    }).toUIMessageStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}
