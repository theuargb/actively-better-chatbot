import { PromptAdForm } from "@/components/admin/prompt-ads/prompt-ad-form";
import { requireAdminPermission } from "auth/permissions";
import { notFound, unauthorized } from "next/navigation";
import { promptAdRepository } from "lib/db/repository";

export const dynamic = "force-dynamic";

export default async function EditPromptAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  const { id } = await params;
  const ad = await promptAdRepository.selectById(id);
  if (!ad) notFound();

  return <PromptAdForm ad={ad} />;
}
