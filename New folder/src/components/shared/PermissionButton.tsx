import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { ModulePath } from "@/lib/modulePaths";
import type { Permission } from "@/types";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface PermissionButtonProps extends ButtonVariantProps {
  modulePath: ModulePath;
  action: Permission;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function PermissionButton({
  modulePath,
  action,
  onClick,
  type = "button",
  disabled,
  className,
  variant = "default",
  size = "default",
  children,
}: PermissionButtonProps) {
  const { can } = useAuth();

  if (!can(modulePath, action)) return null;

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
