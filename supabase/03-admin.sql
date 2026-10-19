-- Replace the example UUID and email with the approved account before running.
-- Apply only after the owner confirms administrator access for this exact account.
insert into public.cp_admins(user_id)
select id from auth.users
where id = '00000000-0000-0000-0000-000000000000'::uuid
  and email = 'admin@example.com'
on conflict do nothing;

select u.email, a.user_id
from public.cp_admins a join auth.users u on u.id = a.user_id
where a.user_id = '00000000-0000-0000-0000-000000000000'::uuid;
