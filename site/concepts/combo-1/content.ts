// What the hero says, from the shared data only. Unknowns read "To be announced".
import { conference } from '@/data/conference';

/** Dubai's coordinates (geography, not a conference fact), as on the other builds. */
export const DUBAI_LABEL = '25.2048° N · 55.2708° E';

export const TBA = 'To be announced';

export const facts = {
  edition: conference.edition,
  kind: conference.kind,
  city: conference.city,
  host: conference.host,
  motto: conference.motto,
  dates: conference.dates,
  venue: conference.venue,
};
