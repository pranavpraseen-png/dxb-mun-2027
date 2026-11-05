// Pick seats from my committee (sponsors, signatories, file sharing): a filter box (coss Input) over a
// scrollable list of coss Checkbox rows. Chosen seats float to the top as removable coss Badges.
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { SeatRef } from '@/platform/v2';
import { Input } from './coss/input';
import { Badge } from './coss/badge';
import { CheckRow } from './controls';

export function SeatPicker({
  seats, value, onChange, label, disabledIds = [], disabledWhy,
}: {
  seats: SeatRef[]; value: string[]; onChange: (ids: string[]) => void; label: string;
  disabledIds?: string[]; disabledWhy?: string;
}) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => seats.filter((s) => s.label.toLowerCase().includes(q.trim().toLowerCase())), [seats, q]);
  const toggle = (id: string, on: boolean) => onChange(on ? [...value, id] : value.filter((v) => v !== id));
  const chosen = seats.filter((s) => value.includes(s.id));
  return (
    <fieldset className="flex w-full flex-col gap-2">
      <legend className="mb-1.5 text-[17px] font-semibold">{label} <span className="font-normal text-muted-foreground">({value.length} chosen)</span></legend>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((s) => (
            <Badge key={s.id} variant="secondary" size="lg" render={<button type="button" onClick={() => toggle(s.id, false)} aria-label={`Remove ${s.label}`} />} className="h-8 gap-1.5 px-2.5 text-base sm:h-8 sm:text-base">
              {s.label} <X aria-hidden="true" className="size-4!" />
            </Badge>
          ))}
        </div>
      )}
      <div className="relative w-full">
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a country or seat" aria-label={`Find a seat for ${label}`} className="*:data-[slot=input]:ps-10" />
      </div>
      <div className="max-h-60 w-full overflow-y-auto border bg-background px-3 py-1">
        {shown.length === 0 && <p className="py-2 text-muted-foreground">No seats match.</p>}
        {shown.map((s) => {
          const off = disabledIds.includes(s.id);
          return (
            <CheckRow key={s.id} checked={value.includes(s.id)} onChange={(v) => toggle(s.id, v)} disabled={off} className={off ? 'text-muted-foreground' : undefined}>
              {s.label}{off && disabledWhy && <span className="text-muted-foreground"> · {disabledWhy}</span>}
            </CheckRow>
          );
        })}
      </div>
    </fieldset>
  );
}
