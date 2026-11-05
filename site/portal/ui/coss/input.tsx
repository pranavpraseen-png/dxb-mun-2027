// From coss ui (https://coss.com/ui/r/input.json), copied in and themed for DXB MUN. Licence: AGPL-3.0 (cosscom/coss repository LICENSE), see portal/LIBRARY.md.
import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import { cn } from "./utils";

export type InputProps = Omit<
  InputPrimitive.Props & React.RefAttributes<HTMLInputElement>,
  "size"
> & {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
  nativeInput?: boolean;
};

export function Input({
  className,
  size = "default",
  unstyled = false,
  nativeInput = false,
  style,
  ...props
}: InputProps): React.ReactElement {
  const inputClassName = cn(
    "h-12 w-full min-w-0 rounded-[inherit] px-3.5 text-foreground leading-12 outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-muted-foreground/72 dusk:placeholder:text-muted-foreground autofill:[-webkit-text-fill-color:var(--foreground)]",
    size === "sm" &&
      "h-7.5 px-[calc(--spacing(2.5)-1px)] leading-7.5 sm:h-6.5 sm:leading-6.5",
    size === "lg" && "h-9.5 leading-9.5 sm:h-8.5 sm:leading-8.5",
    props.type === "search" &&
      "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
    props.type === "file" &&
      "text-muted-foreground file:me-3 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
  );

  return (
    <span
      className={
        cn(
          !unstyled &&
            "relative inline-flex w-full rounded-lg border border-input bg-background not-dark:bg-clip-padding text-base shadow-xs/5 ring-ring/24 dusk:ring-ring transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:has-aria-invalid:border-destructive/64 dusk:has-focus-visible:has-aria-invalid:border-destructive has-focus-visible:has-aria-invalid:ring-destructive/16 dusk:has-focus-visible:has-aria-invalid:ring-destructive has-aria-invalid:border-destructive/36 dusk:has-aria-invalid:border-destructive has-focus-visible:border-ring has-autofill:bg-foreground/4 dusk:has-autofill:bg-raised has-disabled:opacity-64 has-[:disabled,:focus-visible,[aria-invalid]]:shadow-none has-focus-visible:ring-[3px] text-[17px] dark:bg-input/32 dusk:bg-raised dark:has-autofill:bg-foreground/8 dusk:has-autofill:bg-raised dark:has-aria-invalid:ring-destructive/24 dusk:has-aria-invalid:ring-destructive dark:not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)]",
          className,
        ) || undefined
      }
      data-size={size}
      data-slot="input-control"
    >
      {nativeInput ? (
        <input
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={typeof style === "function" ? undefined : style}
          {...props}
        />
      ) : (
        <InputPrimitive
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={style}
          {...props}
        />
      )}
    </span>
  );
}

export { InputPrimitive };
