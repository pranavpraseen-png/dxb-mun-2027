// A drag-and-drop file box. The visible control is a coss ui Button that opens the file picker (a hidden
// native file input), so it works by keyboard and on phones; dropping a file anywhere on the box works too.
// The dashed box itself is layout glue (no library ships a drop zone that fits).
import { useId, useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { Button } from './coss/button';
import { cn } from './coss/utils';
import { FieldError } from './kit';
import { sizeText } from '../lib/format';

export function DropZone({
  accept, onFile, validate, busy, label, chosen, compact,
}: {
  accept?: string; onFile: (f: File) => void; validate?: (f: File) => string | null; busy?: boolean;
  label: string; chosen?: File | null; compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const id = useId();
  const take = (f: File | undefined) => {
    if (!f) return;
    const e = validate?.(f) ?? null;
    setErr(e);
    if (!e) onFile(f);
  };
  return (
    <div className="flex w-full flex-col gap-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-input bg-background px-4 text-center transition-colors',
          compact ? 'py-5' : 'py-10 max-md:py-7',
          over && 'border-primary bg-muted',
        )}
      >
        <FileUp aria-hidden="true" className={cn('text-primary', compact ? 'size-8' : 'size-11')} />
        <p className="font-label text-xl font-semibold leading-tight max-md:hidden">{label}</p>
        <Button type="button" size={compact ? 'default' : 'lg'} variant={compact ? 'outline' : 'default'} loading={busy} onClick={() => input.current?.click()} aria-describedby={err ? `${id}-err` : undefined}>
          <Upload aria-hidden="true" /> Choose a file
        </Button>
        {accept && <p className="text-[15px] text-muted-foreground">{accept.split(',').map((t) => t.replace('.', '').toUpperCase()).join(' or ')}, up to 10 MB</p>}
        <input
          ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true"
          onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
      {chosen && <p className="break-all text-[17px]"><span className="text-muted-foreground">Chosen:</span> <strong>{chosen.name}</strong>{sizeText(chosen.size) && <span className="text-muted-foreground"> · {sizeText(chosen.size)}</span>}</p>}
      {err && <FieldError id={`${id}-err`} alert>{err}</FieldError>}
    </div>
  );
}
