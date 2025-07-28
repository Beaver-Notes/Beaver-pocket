import React from "react";
import clsx from "clsx";

type SpinnerProps = {
  size?: number | string;
  color?: string; // Tailwind color class
};

const Spinner: React.FC<SpinnerProps> = ({
  size = 24,
  color = "text-primary",
}) => {
  const sizeValue = typeof size === "number" ? `${size}` : size;

  return (
    <svg
      className={clsx("animate-spin inline-block", color)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      width={sizeValue}
      height={sizeValue}
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default Spinner;
