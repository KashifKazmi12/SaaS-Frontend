import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Palette, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NotificationInboxMenu } from "@/components/notification";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Overview
            </p>
            <h2 className="truncate text-lg font-semibold tracking-tight">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <NotificationInboxMenu />

            <Separator orientation="vertical" className="mx-1 h-6" />

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-2 rounded-full border bg-card py-1 pr-2 pl-1 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <div className="hidden max-w-32 text-left sm:block">
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
