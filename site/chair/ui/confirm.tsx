// (Same pattern as admin/ui/confirm.tsx.) A confirm step for actions that are hard to undo (coss ui Alert Dialog).
// ConfirmDialog is controlled (use it from a menu item); Confirm wraps a trigger button.
import { useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '../../portal/ui/coss/button';
import {
  AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle, AlertDialogTrigger,
} from './coss/alert-dialog';

type Props = { title: string; line?: ReactNode; confirm: string; danger?: boolean; onConfirm: () => unknown };

function Body({ title, line, confirm, danger, onConfirm, close }: Props & { close: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialogPopup className="rounded-sm">
      <AlertDialogHeader className="text-left">
        <AlertDialogTitle className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">{title}</AlertDialogTitle>
        {line && <AlertDialogDescription className="text-base text-muted-foreground">{line}</AlertDialogDescription>}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
        <Button
          variant={danger ? 'destructive-outline' : 'default'}
          loading={busy}
          onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); close(); } }}
        >
          {confirm}
        </Button>
      </AlertDialogFooter>
    </AlertDialogPopup>
  );
}

export function ConfirmDialog({ open, onOpenChange, ...p }: Props & { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <Body {...p} close={() => onOpenChange(false)} />
    </AlertDialog>
  );
}

export function Confirm({ trigger, ...p }: Props & { trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <Body {...p} close={() => setOpen(false)} />
    </AlertDialog>
  );
}
