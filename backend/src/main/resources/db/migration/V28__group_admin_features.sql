-- Group admin features: roles, settings and write policy.
-- Roles per participant:
--   OWNER | ADMIN | MODERATOR | MEMBER
-- Group write policy (chats.who_can_write):
--   ALL | MODERATORS | ADMINS | OWNER
-- Edit/invite policies (chats.who_can_edit_info / who_can_invite):
--   ANYONE | MODERATORS | ADMINS | OWNER

alter table chat_participants
    add column if not exists role varchar(16) not null default 'MEMBER';

alter table chats
    add column if not exists avatar_url text,
    add column if not exists bio varchar(280),
    add column if not exists who_can_write varchar(16) not null default 'ALL',
    add column if not exists who_can_edit_info varchar(16) not null default 'ADMINS',
    add column if not exists who_can_invite varchar(16) not null default 'ADMINS',
    add column if not exists deleted_at timestamp;

-- Backfill: for existing GROUP chats promote the earliest participant to OWNER.
update chat_participants
set role = 'OWNER'
where id in (
    select min(cp.id)
    from chat_participants cp
    join chats c on c.id = cp.chat_id
    where c.type = 'GROUP'
    group by cp.chat_id
);

create index if not exists idx_chat_participants_role on chat_participants(role);
create index if not exists idx_chats_deleted_at on chats(deleted_at);
