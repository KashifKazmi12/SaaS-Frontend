import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ModulePath } from "@/lib/modulePaths";
import type { Permission } from "@/types";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface PermissionIconButtonProps extends ButtonVariantProps {
  modulePath: ModulePath;
  action: Permission;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  tabIndex?: number;
}

export function PermissionIconButton({
  modulePath,
  action,
  label,
  icon,
  onClick,
  type = "button",
  disabled,
  className,
  variant = "outline",
  size = "icon-sm",
  tabIndex,
}: PermissionIconButtonProps) {
  const { can } = useAuth();

  if (!can(modulePath, action)) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type={type}
            variant={variant}
            size={size}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={className}
            tabIndex={tabIndex}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
