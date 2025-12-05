import React from "react";
import { icons, IconName } from "@/lib/remixicon-react";

interface IconProps {
  name: IconName;
  className?: string;
  style?: React.CSSProperties;
}

const Icon: React.FC<IconProps> = ({ name, className, style }) => {
  const IconComponent = icons[name];

  if (!IconComponent) {
    return null; // or fallback icon
  }

  return (
    <IconComponent
      className={
        className
          ? className
          : "border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7"
      }
      style={style}
    />
  );
};

export default Icon;
