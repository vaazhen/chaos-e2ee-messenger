-- Direct chat "message requests" (Instagram-style)
alter table chats add column if not exists direct_status varchar(16);
alter table chats add column if not exists direct_requested_by bigint;

-- Backfill existing direct chats as accepted.
update chats
set direct_status = 'ACCEPTED'
where type = 'DIRECT' and direct_status is null;

create index if not exists idx_chats_direct_status on chats(direct_status);
create index if not exists idx_chats_direct_requested_by on chats(direct_requested_by);

