import React, { ElementType, ReactNode } from "react";

type UiListItemProps = {
  active?: boolean;
  disabled?: boolean;
  small?: boolean;
  tag?: ElementType;
  children?: ReactNode;
  className?: string;
  [key: string]: any; // allows onClick, etc.
};

const UiListItem: React.FC<UiListItemProps> = ({
  active = false,
  disabled = false,
  small = false,
  tag: Tag = "div",
  children,
  className = "",
  ...rest
}) => {
  const baseClasses =
    "ui-list-item rounded-lg flex items-center transition w-full focus:outline-none";

  const activeClasses = active
    ? "bg-primary bg-opacity-10 text-primary dark:bg-secondary dark:bg-opacity-10 dark:text-secondary"
    : "hoverable";

  const sizeClasses = small ? "p-2" : "py-2 px-4";

  const disabledClasses = disabled ? "pointer-events-none bg-opacity-75" : "";

  const combinedClassName = [
    baseClasses,
    activeClasses,
    sizeClasses,
    disabledClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag role="listitem" className={combinedClassName} {...rest}>
      {children}
    </Tag>
  );
};

export default UiListItem;
