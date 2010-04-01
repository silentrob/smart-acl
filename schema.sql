
CREATE TABLE committer (
    id SERIAL PRIMARY KEY,
    name varchar(30) NOT NULL UNIQUE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hosts (
    id SERIAL PRIMARY KEY,
    hosts varchar(250) NOT NULL UNIQUE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    owner_id INTEGER REFERENCES committer (id) ON DELETE CASCADE
);

CREATE TABLE host_committer_map (
    host_id INTEGER REFERENCES hosts (id) ON DELETE CASCADE,
    committer_id INTEGER REFERENCES committer (id) ON DELETE CASCADE,
    PRIMARY KEY ( host_id, committer_id )
);

