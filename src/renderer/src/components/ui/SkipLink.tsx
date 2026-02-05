import * as React from "react";
import { cn } from "../../lib/utils";

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * The ID of the element to skip to (without the # prefix).
   */
  targetId: string;
  /**
   * The text to display in the skip link.
   * @default "Skip to main content"
   */
  children?: React.ReactNode;
}

/**
 * SkipLink component for keyboard accessibility.
 * Allows users to skip repetitive navigation and go directly to the main content.
 * The link is visually hidden until it receives focus.
 */
export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  (
    { targetId, children = "Skip to main content", className, ...props },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        onClick={handleClick}
        className={cn(
          // Visually hidden by default
          "sr-only",
          // Visible when focused
          "focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2",
          // Styling when visible
          "focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground",
          "focus:rounded-md focus:font-medium focus:text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "focus:shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
      </a>
    );
  },
);

SkipLink.displayName = "SkipLink";
