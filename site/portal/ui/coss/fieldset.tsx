// From coss ui (https://coss.com/ui/r/fieldset.json), copied in and themed for DXB MUN. Licence: AGPL-3.0 (cosscom/coss repository LICENSE), see portal/LIBRARY.md.
import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset";
import type React from "react";
import { cn } from "./utils";

export function Fieldset({
  className,
  ...props
}: FieldsetPrimitive.Root.Props): React.ReactElement {
  return (
    <FieldsetPrimitive.Root
      className={className}
      data-slot="fieldset"
      {...props}
    />
  );
}
export function FieldsetLegend({
  className,
  ...props
}: FieldsetPrimitive.Legend.Props): React.ReactElement {
  return (
    <FieldsetPrimitive.Legend
      className={cn("font-semibold text-foreground", className)}
      data-slot="fieldset-legend"
      {...props}
    />
  );
}

export { FieldsetPrimitive };
