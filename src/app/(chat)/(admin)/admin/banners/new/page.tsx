import { BannerForm } from "@/components/admin/banners/banner-form";
import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewBannerPage() {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  return <BannerForm />;
}
