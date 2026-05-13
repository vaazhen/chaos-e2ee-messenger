-- Normalize DIRECT chat user pairs to guarantee at most one active direct chat per pair.
alter table chats
    add column if not exists direct_user_low_id bigint,
    add column if not exists direct_user_high_id bigint;

update chats c
set direct_user_low_id = p.min_user_id,
    direct_user_high_id = p.max_user_id
from (
    select cp.chat_id,
           min(cp.user_id) as min_user_id,
           max(cp.user_id) as max_user_id,
           count(*) as participant_count
    from chat_participants cp
    group by cp.chat_id
) p
where c.id = p.chat_id
  and c.type = 'DIRECT'
  and p.participant_count = 2
  and (c.direct_user_low_id is null or c.direct_user_high_id is null);

create unique index if not exists ux_chats_direct_pair_active
    on chats (direct_user_low_id, direct_user_high_id)
    where type = 'DIRECT'
      and deleted_at is null;

-- Ensure only one OWNER per group.
create unique index if not exists ux_chat_participants_single_owner
    on chat_participants (chat_id)
    where role = 'OWNER';
