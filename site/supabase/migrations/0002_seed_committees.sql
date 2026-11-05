-- DXB MUN platform: seed the 19 committees, the settings row and the deadline keys.
-- Source: site/src/data/conference.ts (abbreviation, name and order as listed there).
-- No seats and no people: the secretariat creates seats; people sign in themselves.
-- kind is set only where the name makes it unambiguous; everything else is 'general'.

insert into public.committees (abbr, name, kind, sort) values
  ('IPMC',     'Indian Prime Minister’s Cabinet',                                    'cabinet',   1),
  ('HCC',      'Historic Crisis Committee',                                          'crisis',    2),
  ('IPC',      'International Press Corps',                                          'press',     3),
  ('WHO',      'World Health Organization',                                          'general',   4),
  ('ECOSOC',   'Economic and Social Council',                                        'general',   5),
  ('AU',       'African Union',                                                      'regional',  6),
  ('EU',       'European Union',                                                     'regional',  7),
  ('ICJ',      'International Court of Justice',                                     'court',     8),
  ('DISEC',    'Disarmament and International Security Committee',                   'general',   9),
  ('UNODC',    'United Nations Office on Drugs and Crime',                           'general',  10),
  ('UNEP',     'United Nations Environment Program',                                 'general',  11),
  ('UNOOSA',   'United Nations Office for Outer Space Affairs',                      'general',  12),
  ('UNSC',     'United Nations Security Council',                                    'security', 13),
  ('UNHRC',    'United Nations Human Rights Council',                                'general',  14),
  ('UNCSW',    'United Nations Commission on the Status of Women',                   'general',  15),
  ('UNCSTD',   'United Nations Commission on Science and Technology for Development', 'general',  16),
  ('SOCHUM',   'Social, Humanitarian, and Cultural Committee',                       'general',  17),
  ('INTERPOL', 'International Criminal Police Organization',                         'general',  18),
  ('NATO',     'North Atlantic Treaty Organization',                                 'regional', 19)
on conflict (abbr) do nothing;

-- The single settings row (0001_init already creates it; this keeps the seed self-contained).
insert into public.settings (id, phase) values (true, 'before')
on conflict (id) do nothing;

-- Deadline keys the app and policies use. Dates come from the owner later.
insert into public.deadlines (key, label, due_at) values
  ('registration',   'Registration',    null),
  ('allocation',     'Allocation',      null),
  ('position_paper', 'Position papers', null)
on conflict (key) do nothing;
