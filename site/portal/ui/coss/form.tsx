// From coss ui (https://coss.com/ui/r/form.json), copied in and themed for DXB MUN. Licence: AGPL-3.0 (cosscom/coss repository LICENSE), see portal/LIBRARY.md.
import { Form as FormPrimitive } from "@base-ui/react/form";
import type React from "react";

export function Form({
  className,
  ...props
}: FormPrimitive.Props): React.ReactElement {
  return <FormPrimitive className={className} data-slot="form" {...props} />;
}

export { FormPrimitive };
