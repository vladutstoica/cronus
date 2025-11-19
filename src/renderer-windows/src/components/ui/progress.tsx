import * as React from "react";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        width: 200,
        height: 8,
        background: "#eee",
        borderRadius: 4,
        ...props.style,
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: "#007bff",
          borderRadius: 4,
        }}
      />
    </div>
  ),
);
Progress.displayName = "Progress";
