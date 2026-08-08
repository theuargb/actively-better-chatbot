import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatStatus = UseChatHelpers<UIMessage>["status"];
type SendMessage = UseChatHelpers<UIMessage>["sendMessage"];
type Stop = UseChatHelpers<UIMessage>["stop"];
type PendingMessage = {
  message: Parameters<SendMessage>[0];
  options: Parameters<SendMessage>[1];
};

export const isChatRequestActive = (status: ChatStatus) =>
  status === "submitted" || status === "streaming";

export class ChatSteeringQueue<T> {
  private pending: T | undefined;

  enqueue(message: T) {
    if (this.pending) return false;
    this.pending = message;
    return true;
  }

  takeWhenReady(status: ChatStatus) {
    if (status !== "ready" || !this.pending) return;
    const message = this.pending;
    this.pending = undefined;
    return message;
  }
}

/**
 * Queues one user message behind an in-flight response. Waiting for `ready`
 * avoids replacing the AI SDK's active response while its abort is settling.
 */
export function useChatSteering({
  status,
  sendMessage,
  stop,
}: {
  status: ChatStatus;
  sendMessage: SendMessage;
  stop: Stop;
}) {
  const queueRef = useRef(new ChatSteeringQueue<PendingMessage>());
  const [isSteering, setIsSteering] = useState(false);

  const sendSteeringMessage = useCallback<SendMessage>(
    async (message, options) => {
      if (!isChatRequestActive(status)) {
        await sendMessage(message, options);
        return;
      }

      if (!message) {
        await stop();
        return;
      }

      if (!queueRef.current.enqueue({ message, options })) return;
      setIsSteering(true);
      await stop();
    },
    [sendMessage, status, stop],
  );

  useEffect(() => {
    if (status !== "ready") return;

    const pendingMessage = queueRef.current.takeWhenReady(status);
    if (!pendingMessage) return;

    setIsSteering(false);
    void sendMessage(pendingMessage.message, pendingMessage.options);
  }, [sendMessage, status]);

  return { isSteering, sendSteeringMessage };
}
