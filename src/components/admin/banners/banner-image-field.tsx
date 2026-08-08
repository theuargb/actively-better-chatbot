"use client";

import { useCallback, useRef } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "ui/button";
import { useFileUpload } from "@/hooks/use-presigned-upload";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Uploads the banner image through the shared storage abstraction (Vercel Blob
 * / S3 / server multipart, resolved by `useFileUpload`) and hands back the
 * public URL.
 */
export function BannerImageField({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
}) {
  const t = useTranslations("Admin.Banners");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useFileUpload();

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset immediately so picking the same file twice still fires onChange.
      event.target.value = "";
      if (!file) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(t("imageInvalidType"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("imageTooLarge"));
        return;
      }

      const result = await upload(file);
      if (!result) return; // useFileUpload already toasted the failure
      onChange(result.url);
      toast.success(t("imageUploaded"));
    },
    [upload, onChange, t],
  );

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
        {isUploading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : imageUrl ? (
          // Admin-uploaded, so the host is not known to next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            data-testid="banner-image-upload"
          >
            <Upload className="size-3.5 mr-1" />
            {imageUrl ? t("imageReplace") : t("imageUpload")}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => onChange(null)}
              data-testid="banner-image-remove"
            >
              <Trash2 className="size-3.5 mr-1 text-destructive" />
              {t("imageRemove")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("fieldImageDescription")}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
}
