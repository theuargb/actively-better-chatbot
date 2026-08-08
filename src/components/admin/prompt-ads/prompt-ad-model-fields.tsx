"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { Checkbox } from "ui/checkbox";
import { Label } from "ui/label";
import { Switch } from "ui/switch";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import type { PromptAdModel } from "app-types/prompt-ad";

const identity = (model: PromptAdModel) => `${model.provider}:${model.model}`;

/**
 * `null` means "every model". The switch is the only way to tell that apart
 * from a scoped ad whose boxes are all unchecked.
 */
export function PromptAdModelFields({
  models,
  onChange,
}: {
  models: PromptAdModel[] | null;
  onChange: (models: PromptAdModel[] | null) => void;
}) {
  const t = useTranslations("Admin.PromptAds");
  const { data: providers } = useChatModels();

  const isScoped = models !== null;
  const selected = new Set((models ?? []).map(identity));

  const toggle = useCallback(
    (model: PromptAdModel, checked: boolean) => {
      const current = models ?? [];
      onChange(
        checked
          ? [...current.filter((m) => identity(m) !== identity(model)), model]
          : current.filter((m) => identity(m) !== identity(model)),
      );
    },
    [models, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="prompt-ad-all-models">{t("fieldAllModels")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("fieldAllModelsDescription")}
          </p>
        </div>
        <Switch
          id="prompt-ad-all-models"
          checked={!isScoped}
          onCheckedChange={(all) => onChange(all ? null : [])}
          data-testid="prompt-ad-all-models"
        />
      </div>

      {isScoped && (
        <div className="rounded-lg border p-3 space-y-3 max-h-72 overflow-y-auto">
          {(providers ?? []).map((provider) => (
            <div key={provider.provider} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {provider.provider}
              </p>
              {provider.models.map((model) => {
                const value: PromptAdModel = {
                  provider: provider.provider,
                  model: model.name,
                };
                return (
                  <label
                    key={model.name}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                    data-testid={`prompt-ad-model-${identity(value)}`}
                  >
                    <Checkbox
                      checked={selected.has(identity(value))}
                      onCheckedChange={(checked) =>
                        toggle(value, checked === true)
                      }
                    />
                    <span className="text-sm truncate">{model.name}</span>
                  </label>
                );
              })}
            </div>
          ))}
          {models?.length === 0 && (
            <p className="text-xs text-destructive">{t("modelsRequired")}</p>
          )}
        </div>
      )}
    </div>
  );
}
