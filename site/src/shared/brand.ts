// Brand slot. The owner has a newer DXB MUN logo that is not in the repo yet.
// When it arrives: put the file in site/public/brand/ and set `logoSrc` (and optionally the colours).
// Every concept must render the logo through this slot: if logoSrc is null, show its own type-only wordmark.
export const brand = {
  logoSrc: null as string | null,
  logoAlt: 'DXB MUN logo',
  wordmark: 'DXB MUN',
};
