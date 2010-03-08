CREATE SEQUENCE committer_seq;

CREATE TABLE committer (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT nextval('committer_seq'),
  name varchar(30) DEFAULT NULL,
  created_at date DEFAULT NULL
);

CREATE UNIQUE INDEX committer_idx ON committer (name);

CREATE SEQUENCE map_seq;

CREATE TABLE host_committer_map (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT nextval('map_seq'),
  host_id integer DEFAULT NULL,
  committer_id integer DEFAULT NULL
);

CREATE UNIQUE INDEX hosts_committer_idx ON host_committer_map (host_id,committer_id);


CREATE SEQUENCE hosts_seq;
CREATE TABLE hosts (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT nextval('hosts_seq'),
  hosts varchar(50) DEFAULT NULL,
  created_at date DEFAULT NULL
);

CREATE UNIQUE INDEX hosts_idx ON hosts (hosts);