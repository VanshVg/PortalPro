import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Multi-line text input with PortalPro styling.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
          "resize-y transition-colors",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
