import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface IsProductiveTooltipProps {
  children: ReactNode;
}

export function IsProductiveTooltip({ children }: IsProductiveTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            Choose if this category is considered a <b>productive</b> category
            and you want to do <b>more</b> of, or if this is something you want
            to do <b>less</b> of. This will be used to calculate statistics
            about your overall productivity on a given day or week.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
