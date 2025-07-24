import React, { ReactNode, ComponentType, HTMLAttributes } from "react";
import Spinner from "@/components/UI/Spinner";

type ButtonVariant = "default" | "primary" | "danger";

// Define the component props interface
interface UiButtonProps extends Omit<HTMLAttributes<HTMLElement>, "role"> {
  children: ReactNode;
  icon?: boolean;
  disabled?: boolean;
  loading?: boolean;
  circle?: boolean;
  color?: string;
  tag?: ComponentType<any> | keyof JSX.IntrinsicElements;
  variant?: ButtonVariant;
}

const UiButton: React.FC<UiButtonProps> = ({
  children,
  icon = false,
  disabled = false,
  loading = false,
  circle = false,
  color = "",
  tag: Component = "button",
  variant = "default",
  className = "",
  ...props
}) => {
  const variants: Record<ButtonVariant, string> = {
    default: "bg-input",
    primary:
      "bg-primary text-white dark:bg-secondary dark:hover:bg-primary hover:bg-secondary",
    danger:
      "bg-red-500 text-white dark:bg-red-600 dark:hover:bg-red-500 hover:bg-red-600",
  };

  const buttonClasses = [
    "ui-button h-10 relative transition focus:ring-2 ring-secondary",
    color || variants[variant],
    icon ? "p-2" : "py-2 px-4",
    circle ? "rounded-full" : "rounded-lg",
    disabled && "opacity-70",
    (loading || disabled) && "pointer-events-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const buttonProps = {
    role: "button" as const,
    className: buttonClasses,
    disabled: loading || disabled,
    ...props,
  };

  return (
    <Component {...buttonProps}>
      <span
        className={`flex justify-center h-full items-center ${
          loading ? "opacity-25" : ""
        }`}
      >
        {children}
      </span>
      {loading && (
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Spinner
            color={variant === "default" ? "text-primary" : "text-white"}
          />
        </div>
      )}
    </Component>
  );
};

export default UiButton;
