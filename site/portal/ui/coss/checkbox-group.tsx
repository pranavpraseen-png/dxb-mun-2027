// From coss ui (https://coss.com/ui/r/checkbox-group.json), copied in and themed for DXB MUN. Licence: AGPL-3.0 (cosscom/coss repository LICENSE), see portal/LIBRARY.md.
import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group";
import type React from "react";
import { cn } from "./utils";

export function CheckboxGroup({
  className,
  ...props
}: CheckboxGroupPrimitive.Props): React.ReactElement {
  return (
    <CheckboxGroupPrimitive
      className={cn("flex flex-col items-start gap-3", className)}
      {...props}
    />
  );
}

export { CheckboxGroupPrimitive };
