create table if not exists scripts (
  id text primary key,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  handle text not null default 'guest',
  tags text not null default '',
  license text not null default 'MIT',
  stars integer not null default 0,
  forks integer not null default 0,
  views integer not null default 0,
  forked_from text,
  edit_token text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists script_files (
  id text primary key,
  script_id text not null,
  filename text not null,
  language text not null,
  content text not null,
  position integer not null default 0,
  unique (script_id, filename)
);

create table if not exists script_revisions (
  id text primary key,
  script_id text not null,
  message text not null,
  created_at text not null default (datetime('now'))
);

create table if not exists script_stars (
  script_id text not null,
  voter_key text not null,
  primary key (script_id, voter_key)
);

create index if not exists scripts_updated_idx on scripts (updated_at desc);
