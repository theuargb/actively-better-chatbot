import { getBannerForUser } from "lib/banner/server";
import { BannerAnnouncement } from "./banner-announcement";

/**
 * Server half of the banner modal. Mounted inside a `Suspense` boundary so the
 * per-user dismissal lookup never blocks the app shell.
 */
export async function BannerAnnouncementLoader({
  userId,
}: {
  userId: string;
}) {
  const banner = await getBannerForUser(userId);
  if (!banner) return null;
  // Keyed so a queued second banner remounts instead of inheriting the
  // dismissed `open` state of the one before it.
  return <BannerAnnouncement key={banner.id} banner={banner} />;
}
