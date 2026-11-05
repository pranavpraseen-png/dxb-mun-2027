// Themed form controls: coss ui Input, Textarea, Select, Checkbox, RadioGroup, used the same way everywhere.
import type * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from './coss/utils';
import { Input } from './coss/input';
import { Textarea } from './coss/textarea';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from './coss/select';
import { Checkbox } from './coss/checkbox';
import { Label } from './coss/label';

export { Button } from './coss/button';

export const TextInput = Input;

export function TextArea({ className, rows = 3, ...props }: React.ComponentProps<typeof Textarea>) {
  return <Textarea className={cn('text-[17px] sm:text-[17px]', className)} rows={rows} {...props} />;
}

export type Option = { value: string; label: string; disabled?: boolean };

/** coss Select (Base UI): a custom listbox with keyboard support. `value` '' means nothing chosen. */
export function Choice({
  id, value, onChange, options, placeholder, invalid, describedBy, label,
}: {
  id?: string; value: string; onChange: (v: string) => void; options: Option[]; placeholder: string;
  invalid?: boolean; describedBy?: string; label?: string;
}) {
  const items = [{ value: '', label: placeholder }, ...options];
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange((v as string | null) ?? '')}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={label}
        className="min-h-12 text-[17px] sm:min-h-12 sm:text-[17px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectPopup className="max-h-[min(var(--available-height),24rem)]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled} className="min-h-11 text-base sm:min-h-10 sm:text-base">
            {o.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/** Checkbox with its label as one 44px target (coss Checkbox + Label). */
export function CheckRow({ checked, onChange, children, className, disabled }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <Label className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[17px] font-normal leading-snug sm:text-[17px]', className)}>
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5 size-6 sm:size-6 [&_svg]:size-4!" />
      <span>{children}</span>
    </Label>
  );
}
