import { BannersTable } from "@/components/admin/banners/banners-table";
import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";
import { bannerRepository } from "lib/db/repository";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BannersPage({ searchParams }: PageProps) {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  const params = await searchParams;
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const { items, total } = await bannerRepository.selectList({
    limit: PAGE_LIMIT,
    offset: (page - 1) * PAGE_LIMIT,
  });

  return (
    <BannersTable items={items} total={total} page={page} limit={PAGE_LIMIT} />
  );
}
