import { BannerForm } from "@/components/admin/banners/banner-form";
import { requireAdminPermission } from "auth/permissions";
import { notFound, unauthorized } from "next/navigation";
import { bannerRepository } from "lib/db/repository";

export const dynamic = "force-dynamic";

export default async function EditBannerPage({
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
  const banner = await bannerRepository.selectById(id);
  if (!banner) notFound();

  return <BannerForm banner={banner} />;
}
