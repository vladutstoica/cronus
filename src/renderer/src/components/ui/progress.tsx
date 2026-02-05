import * as React from "react";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Current progress value (0-100).
   */
  value?: number;
  /**
   * Maximum value for the progress bar (default: 100).
   */
  max?: number;
  /**
   * Accessible label for the progress bar.
   * Required for screen reader users to understand what is being measured.
   */
  "aria-label"?: string;
  /**
   * ID of the element that labels this progress bar.
   */
  "aria-labelledby"?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value = 0,
      max = 100,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      style={{
        width: 200,
        height: 8,
        background: "#eee",
        borderRadius: 4,
        ...props.style,
      }}
      {...props}
    >
      <div
        style={{
          width: `${(value / max) * 100}%`,
          height: "100%",
          background: "#007bff",
          borderRadius: 4,
        }}
      />
    </div>
  ),
);
Progress.displayName = "Progress";
