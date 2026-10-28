import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import useSWR, { SWRConfiguration } from "swr";

export const useChatModels = (options?: SWRConfiguration) => {
  return useSWR<
    {
      provider: string;
      hasAPIKey: boolean;
      models: {
        name: string;
        isToolCallUnsupported: boolean;
        isImageInputUnsupported: boolean;
        supportedFileMimeTypes: string[];
        locked: boolean;
        requiredPlanName: string | null;
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: (data) => {
      const status = appStore.getState();
      if (!status.chatModel) {
        // Never default to a model the user can't use.
        const provider = data.find(
          (p) => p.hasAPIKey && p.models.some((m) => !m.locked),
        );
        const model = provider?.models.find((m) => !m.locked);
        if (provider && model) {
          appStore.setState({
            chatModel: { provider: provider.provider, model: model.name },
          });
        }
      }
    },
    ...options,
  });
};
