import React, { ReactNode, ElementType, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  hover?: boolean;
  padding?: string;
  tag?: ElementType;
  className?: string;
  children?: ReactNode;
}

const UiCard: React.FC<CardProps> = ({
  hover = false,
  padding = "p-4",
  tag = "div",
  className = "",
  children,
  ...props
}) => {
  const Component = tag as ElementType;

  const baseClasses =
    "bg-[#F8F8F7] dark:bg-[#353333] transform rounded-xl transition-transform ui-card overflow-hidden";
  const hoverClasses = hover ? "hover:shadow-xl hover:-translate-y-1" : "";

  const combinedClasses =
    `${baseClasses} ${padding} ${hoverClasses} ${className}`.trim();

  return (
    <Component className={combinedClasses} {...props}>
      {children}
    </Component>
  );
};

export default UiCard;
