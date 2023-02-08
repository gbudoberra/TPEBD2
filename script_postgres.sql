create table files(
    mongoId text primary key,
    owner integer,
    title varchar(200),
    tag varchar(200)
);
create index if not exists index_files_owner on files using hash (owner);
create table users (
    id bigserial not null,
    username varchar(200) not null,
    password varchar(200) not null,
    primary key (id),
    unique(username)
);
create index if not exists index_users_username on users using hash (username);
create table shared(
    toUser bigserial,
    docId text,
    foreign key(toUser) references users(id),
    foreign key(docId) references files(mongoId),
    primary key(toUser, docId)
);
create index if not exists index_shared_user on shared using hash (toUser);
create index if not exists index_shared_doc on shared using hash (docId);
