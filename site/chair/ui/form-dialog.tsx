// A small form in a coss ui Dialog: a trigger, a title, fields, and one submit button.
// The dialog closes only when onSubmit resolves true.
import { useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '../../portal/ui/coss/button';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from './coss/dialog';

export function FormDialog({
  trigger, title, line, submit, canSubmit = true, onSubmit, onOpen, children, danger,
}: {
  trigger: ReactElement; title: string; line?: ReactNode; submit: string; canSubmit?: boolean;
  onSubmit: () => Promise<boolean>; onOpen?: () => void; children: ReactNode; danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) onOpen?.(); }}>
      <DialogTrigger render={trigger} />
      <DialogPopup className="max-w-lg rounded-sm">
        <form className="contents" onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setBusy(true);
          try { if (await onSubmit()) setOpen(false); } finally { setBusy(false); }
        }}>
          <DialogHeader>
            <DialogTitle className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">{title}</DialogTitle>
            {line && <DialogDescription className="text-base text-muted-foreground">{line}</DialogDescription>}
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-3">{children}</DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" variant={danger ? 'destructive-outline' : 'default'} disabled={!canSubmit} loading={busy}>{submit}</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
