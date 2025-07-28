import React, { ReactNode } from "react";

type UiListProps = {
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
};

const UiList: React.FC<UiListProps> = ({
  disabled = false,
  children,
  className,
}) => {
  return (
    <div
      role="listbox"
      className={`ui-list${
        disabled ? " pointer-events-none" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default UiList;
