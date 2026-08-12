import { useNavigate } from "react-router-dom";
import { LogOut, Settings as SettingsIcon, User, ShieldCheck, LifeBuoy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

/** Avatar-triggered user menu shown in the topbar. */
export function UserMenu() {
  const { user, logout, isImpersonating, endImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function returnToAdmin() {
    endImpersonation();
    navigate("/app/admin/users");
  }

  return (
    <DropdownMenu
      side="bottom"
      align="end"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar src={null} alt={user.name} fallback={user.name} size="sm" />
        </button>
      }
    >
      {() => (
        <>
          <DropdownMenuLabel>
            <div className="flex items-center gap-2.5">
              <Avatar src={null} alt={user.name} fallback={user.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          {isImpersonating && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={returnToAdmin}>
                <ShieldCheck className="mr-1" /> Return to admin
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/app/settings")}>
            <User className="mr-1" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("/app/settings")}>
            <SettingsIcon className="mr-1" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("/app/support")}>
            <LifeBuoy className="mr-1" /> Support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => void logout()}>
            <LogOut className="mr-1" /> Sign out
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}