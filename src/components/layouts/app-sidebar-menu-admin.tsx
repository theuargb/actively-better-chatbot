import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "ui/sidebar";
import { Tooltip } from "ui/tooltip";
import { SidebarMenuItem } from "ui/sidebar";
import { SidebarMenuButton } from "ui/sidebar";
import { ChartColumn, CreditCard, Link2, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const AppSidebarAdmin = () => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Admin");
  const shouldExpandAdmin = useMemo(() => {
    return pathname.startsWith("/admin");
  }, [pathname]);
  const adminNavItems = useMemo(
    () => [
      {
        id: "plans",
        title: t("Plans.title"),
        url: "/admin/plans",
        icon: CreditCard,
        isActive: pathname.startsWith("/admin/plans"),
      },
      {
        id: "users",
        title: t("Users.title"),
        url: "/admin/users",
        icon: Users,
        isActive: pathname.startsWith("/admin/users"),
      },
      {
        id: "usage",
        title: t("Usage.title"),
        url: "/admin/usage",
        icon: ChartColumn,
        isActive: pathname.startsWith("/admin/usage"),
      },
      {
        id: "url-rewrites",
        title: t("UrlRewrites.title"),
        url: "/admin/url-rewrites",
        icon: Link2,
        isActive: pathname.startsWith("/admin/url-rewrites"),
      },
    ],
    [t, pathname],
  );

  return (
    <SidebarMenu className="group/admin">
      <Tooltip>
        <SidebarMenuItem>
          {/* Users stays the admin landing page even though Plans leads the sub-nav. */}
          <Link href="/admin/users" data-testid="admin-sidebar-link">
            <SidebarMenuButton className="font-semibold">
              <Shield className="size-4 text-foreground" />
              {t("title")}
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </Tooltip>
      {shouldExpandAdmin && (
        <SidebarMenuSub className="mb-2">
          {adminNavItems.map((item) => (
            <SidebarMenuSubItem key={item.id}>
              <SidebarMenuSubButton
                className="text-muted-foreground"
                data-testid={`admin-sidebar-link-${item.id}`}
                onClick={() => {
                  router.push(item.url);
                }}
                isActive={item.isActive}
              >
                {item.title}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenu>
  );
};

export { AppSidebarAdmin };
