import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Palette, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLayout } from "@/context/LayoutContext";
import { NotificationInboxMenu } from "@/components/notification";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { formatAssignedBusinesses } from "@/lib/business";
import { getPageTitle, MODULE_PATHS } from "@/lib/modulePaths";
import { getInitials } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ProfileDialog } from "./ProfileDialog";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar() {
  const { user, signOut } = useAuth();
  const { openMobileNav } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={openMobileNav}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:block">
                Overview
              </p>
              <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {pageTitle}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />

            <NotificationInboxMenu />

            <Separator orientation="vertical" className="mx-0.5 hidden h-6 sm:mx-1 sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-2 rounded-full border bg-card py-1 pr-1.5 pl-1 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:pr-2"
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <div className="hidden max-w-32 text-left md:block">
                  <p className="truncate text-sm font-medium leading-none">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.isSuperAdmin
                      ? "Super Admin"
                      : user?.businesses?.length
                        ? formatAssignedBusinesses(user.businesses)
                        : user?.role?.name || "User"}
                  </p>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs font-normal text-muted-foreground">{user?.username}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <UserRound className="size-4" />
                  Edit profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(MODULE_PATHS.SETTINGS_THEMES)}>
                  <Palette className="size-4" />
                  My theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                  <LogOut className="size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
