import { PromptAdForm } from "@/components/admin/prompt-ads/prompt-ad-form";
import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewPromptAdPage() {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  return <PromptAdForm />;
}
