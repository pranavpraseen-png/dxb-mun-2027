// My seat: the DXB MUN nameplate, the facts the secretariat entered (room, chairs, partner) and the
// check-in QR (qrcode.react). Unknown values say "To be announced".
import type { ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { MySeat } from '@/platform/v2';
import { Facts, Nameplate } from './kit';

import { TBA } from '../lib/format';
export { TBA };
const CHAIR_ROLE = { chair: 'Chair', vice_chair: 'Vice chair', rapporteur: 'Rapporteur' } as const;

export function SeatFacts({ seat }: { seat: MySeat }) {
  const chairs = seat.chairs.length
    ? seat.chairs.map((c, i) => (
      <span key={i} className="block">
        <span className="text-muted-foreground">{CHAIR_ROLE[c.role]}:</span> {c.fullName ?? TBA}
      </span>
    ))
    : TBA;
  const items: [ReactNode, ReactNode, string?][] = [
    ['Committee', `${seat.committee.abbr} · ${seat.committee.name}`],
    ['Room', seat.room ?? TBA, seat.room ? undefined : 'text-muted-foreground'],
    ['Chairs', chairs],
  ];
  if (seat.partner) items.push(['Partner', seat.partner]);
  return <Facts items={items} />;
}

export function SeatPlate({ seat }: { seat: MySeat }) {
  return <div className="w-full"><Nameplate seat={seat.seat.label} abbr={seat.committee.abbr} name={seat.committee.name} /></div>;
}

export function CheckinQr({ seat, name }: { seat: MySeat; name?: string | null }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-5">
      <div className="shrink-0">
        <QRCodeSVG value={seat.checkinCode} size={200} level="M" marginSize={2} title="Your check-in QR code" className="size-50 max-w-full" />
      </div>
      <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-1.5">
        {name && <p className="font-heading text-[26px] font-semibold leading-[1.1] tracking-[-0.01em]">{name}</p>}
        <p className="font-label text-xl font-semibold text-foreground">{seat.seat.label}</p>
        <p className="text-[17px]">Show this at the check-in desk.</p>
        <p className="break-all font-mono text-[15px] text-muted-foreground" aria-label={`Code ${seat.checkinCode}`}>{seat.checkinCode}</p>
      </div>
    </div>
  );
}
