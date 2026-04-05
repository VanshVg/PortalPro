"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../lib/utils";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Error message to display below the input. */
  error?: string;
}

/**
 * Password input with a show/hide toggle button.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="w-full">
        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            className={cn(
              "flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm text-neutral-800 placeholder:text-neutral-400 transition-colors",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400",
              error && "border-error focus:border-error focus:ring-error/20",
              className,
            )}
            ref={ref}
            aria-invalid={!!error}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-600"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
