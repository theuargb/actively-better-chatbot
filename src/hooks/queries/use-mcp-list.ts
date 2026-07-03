"use client";
import { appStore } from "@/app/store";
import useSWR, { SWRConfiguration } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { fetcher } from "lib/utils";
import { AllowedMCPServer, MCPServerInfo } from "app-types/mcp";

function getAllowedMcpServersWithDefaults(
  mcpList: MCPServerInfo[],
  previousAllowedMcpServers?: Record<string, AllowedMCPServer>,
): Record<string, AllowedMCPServer> {
  return mcpList.reduce(
    (acc, server) => {
      const availableTools = server.toolInfo.map((tool) => tool.name);
      const previous = previousAllowedMcpServers?.[server.id];

      acc[server.id] = previous
        ? {
            ...previous,
            tools: previous.tools.filter((tool) =>
              availableTools.includes(tool),
            ),
          }
        : {
            tools: availableTools,
          };

      return acc;
    },
    {} as Record<string, AllowedMCPServer>,
  );
}

export function useMcpList(options?: SWRConfiguration) {
  return useSWR<MCPServerInfo[]>("/api/mcp/list", fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    focusThrottleInterval: 1000 * 60 * 5,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: (data) => {
      appStore.setState((prev) => ({
        mcpList: data,
        allowedMcpServers: getAllowedMcpServersWithDefaults(
          data,
          prev.allowedMcpServers,
        ),
      }));
    },
    ...options,
  });
}
