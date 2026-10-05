import React from "react";
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from "./ui/button";

export interface ButtonProps extends Omit<ShadcnButtonProps, "variant"> {
  variant?: "primary" | "danger" | "secondary" | "default" | "destructive" | "outline" | "ghost" | "link" | "success";
  loading?: boolean;
}

const variantMapping = {
  primary: "default" as const,
  danger: "destructive" as const,
  secondary: "secondary" as const,
  default: "default" as const,
  destructive: "destructive" as const,
  outline: "outline" as const,
  ghost: "ghost" as const,
  link: "link" as const,
  success: "success" as const,
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", ...props }, ref) => {
    const mappedVariant = variantMapping[variant] || "default";
    return <ShadcnButton ref={ref} variant={mappedVariant} {...props} />;
  }
);
Button.displayName = "Button";

export default Button;