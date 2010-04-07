BEGIN;

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

--
-- Create plpgsql language on current database then add bonus functions
--
CREATE LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_or_create_committer (VARCHAR(30)) RETURNS INTEGER AS $$
DECLARE
    committer_name ALIAS FOR $1;
    committer_id INTEGER;
BEGIN
    SELECT INTO committer_id id FROM committer WHERE name = committer_name;
    IF NOT FOUND THEN
        INSERT INTO committer (name) VALUES (committer_name) RETURNING id INTO committer_id;
    END IF;
    RETURN committer_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_or_create_host (VARCHAR(250), VARCHAR(30)) RETURNS INTEGER AS $$
DECLARE
    host_name ALIAS FOR $1;
    host_id INTEGER;
    committer_name ALIAS FOR $2;
    committer_id INTEGER;
BEGIN
    SELECT INTO host_id id FROM hosts WHERE hosts = host_name;
    IF NOT FOUND THEN
        SELECT INTO committer_id get_or_create_committer(committer_name);
        INSERT INTO hosts (hosts, owner_id) VALUES (host_name, committer_id) RETURNING id INTO host_id;
    END IF;
    RETURN host_id;
END;
$$ LANGUAGE plpgsql;



COMMIT;
