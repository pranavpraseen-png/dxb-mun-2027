// From coss ui (https://coss.com/ui/r/label.json), copied in and themed for DXB MUN. Licence: AGPL-3.0 (cosscom/coss repository LICENSE), see portal/LIBRARY.md.
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type React from "react";
import { cn } from "./utils";

export function Label({
  className,
  render,
  ...props
}: useRender.ComponentProps<"label">): React.ReactElement {
  const defaultProps = {
    className: cn(
      "inline-flex items-center gap-2 font-medium text-base/4.5 text-foreground sm:text-sm/4",
      className,
    ),
    "data-slot": "label",
  };

  return useRender({
    defaultTagName: "label",
    props: mergeProps<"label">(defaultProps, props),
    render,
  });
}
