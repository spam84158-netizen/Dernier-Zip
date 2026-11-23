-- Snow Cloud Chek — LOT 3 : groupes et chaînes façon WhatsApp (création réservée à l'admin).
-- À exécuter APRÈS schema.sql, schema_part2.sql, schema_part3.sql et schema_lot2.sql. Idempotent.

-- ============ 1) Groupes et chaînes ============
alter table public.groups add column if not exists type text not null default 'group';
alter table public.groups drop constraint if exists groups_type_check;
alter table public.groups add constraint groups_type_check check (type in ('group','channel'));
alter table public.groups add column if not exists blue_badge boolean not null default true;      -- badge bleu (créés par l'admin)
alter table public.groups add column if not exists join_mode text not null default 'open';        -- open | approval | invite
alter table public.groups drop constraint if exists groups_join_mode_check;
alter table public.groups add constraint groups_join_mode_check check (join_mode in ('open','approval','invite'));
alter table public.groups add column if not exists post_mode text not null default 'all';         -- all | admins (annonces / chaînes)
alter table public.groups drop constraint if exists groups_post_mode_check;
alter table public.groups add constraint groups_post_mode_check check (post_mode in ('all','admins'));
alter table public.groups add column if not exists auto_join boolean not null default false;      -- ajouté automatiquement à l'inscription
alter table public.groups add column if not exists invite_code text;
update public.groups set invite_code = substr(md5(id::text||random()::text),1,10) where invite_code is null;
create unique index if not exists groups_invite_code_key on public.groups(invite_code);
alter table public.groups alter column invite_code set default substr(md5(random()::text||clock_timestamp()::text),1,10);
update public.groups set auto_join = true where is_general;

-- ============ 2) Messages : épingles, vocaux, transferts ============
alter table public.messages add column if not exists pinned boolean not null default false;
alter table public.messages add column if not exists pinned_by uuid;
alter table public.messages add column if not exists meta jsonb not null default '{}';
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid = 'public.messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%' loop
    execute format('alter table public.messages drop constraint %I', c.conname);
  end loop;
  alter table public.messages add constraint messages_kind_check check (kind in ('text','image','file','sticker','audio','system'));
end $$;

-- Les messages vocaux sont stockés avec les images.
update storage.buckets set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/x-m4a']
  where id = 'media';

-- ============ 3) État de lecture, sourdine, effacement, demandes d'adhésion ============
create table if not exists public.chat_reads(user_id uuid references public.profiles(id) on delete cascade, chat_key text not null,
  last_read timestamptz default now(), muted boolean not null default false, pinned boolean not null default false, cleared_at timestamptz,
  primary key(user_id, chat_key));
alter table public.chat_reads enable row level security;
drop policy if exists cr_own on public.chat_reads;
create policy cr_own on public.chat_reads for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.hidden_messages(user_id uuid references public.profiles(id) on delete cascade, message_id uuid references public.messages(id) on delete cascade, primary key(user_id, message_id));
alter table public.hidden_messages enable row level security;
drop policy if exists hm_own on public.hidden_messages;
create policy hm_own on public.hidden_messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.join_requests(group_id uuid references public.groups(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz default now(), primary key(group_id, user_id));
alter table public.join_requests enable row level security;

-- ============ 4) Fonctions d'aide aux droits ============
create or replace function public.is_group_admin(gid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or coalesce((select m.role in ('owner','admin') from group_members m where m.group_id = gid and m.user_id = auth.uid()), false) $$;
create or replace function public.can_post(gid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from group_members m join groups g on g.id = m.group_id
    where m.group_id = gid and m.user_id = auth.uid() and (public.is_admin() or m.role in ('owner','admin') or (g.type = 'group' and g.post_mode = 'all'))) $$;
create or replace function public.group_member_count(gid uuid) returns bigint language sql stable security definer set search_path=public as $$
  select count(*) from group_members where group_id = gid $$;

drop policy if exists jr_read on public.join_requests;
create policy jr_read on public.join_requests for select using (user_id = auth.uid() or public.is_group_admin(group_id));

-- ============ 5) Règles : seul l'admin crée ; adhésion et publication contrôlées ============
drop policy if exists g_ins on public.groups;
drop policy if exists g_mod on public.groups;
drop policy if exists g_admin on public.groups;
create policy g_admin on public.groups for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists g_mod_upd on public.groups;
create policy g_mod_upd on public.groups for update using (public.is_mod()) with check (public.is_mod());

drop policy if exists gm_read on public.group_members;
create policy gm_read on public.group_members for select using (
  user_id = auth.uid() or public.is_mod() or public.is_group_admin(group_id)
  or (public.is_member(group_id) and exists (select 1 from groups g where g.id = group_id and g.type = 'group')));
drop policy if exists gm_join on public.group_members;
create policy gm_join on public.group_members for insert with check (user_id = auth.uid() and coalesce(role,'member') = 'member'
  and exists (select 1 from groups g where g.id = group_id and g.kind in ('public','official') and g.join_mode = 'open'));

drop policy if exists m_ins on public.messages;
create policy m_ins on public.messages for insert with check (sender = auth.uid()
  and not exists (select 1 from profiles where id = auth.uid() and suspended)
  and (group_id is null or public.can_post(group_id))
  and not exists (select 1 from blocks b where b.blocker = messages.dm_to and b.blocked = auth.uid()));

-- ============ 6) Création et gestion (réservées à l'admin du site / admins du groupe) ============
create or replace function public.create_group(p_name text, p_desc text, p_type text, p_join_mode text, p_post_mode text, p_avatar text, p_auto_join boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare gid uuid; t text := case when p_type = 'channel' then 'channel' else 'group' end; jm text := case when p_join_mode in ('approval','invite') then p_join_mode else 'open' end;
begin
  if not public.is_admin() then raise exception 'Seul l''administrateur peut créer un groupe ou une chaîne.'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Donne un nom au groupe.'; end if;
  insert into groups(name, description, avatar_url, kind, type, join_mode, post_mode, auto_join, blue_badge, created_by)
    values (left(trim(p_name),80), left(p_desc,500), p_avatar, case when jm = 'invite' then 'private' else 'public' end, t, jm,
            case when t = 'channel' then 'admins' when p_post_mode = 'admins' then 'admins' else 'all' end, coalesce(p_auto_join,false), true, auth.uid())
    returning id into gid;
  insert into group_members(group_id, user_id, role) values (gid, auth.uid(), 'owner');
  if coalesce(p_auto_join,false) then
    insert into group_members(group_id, user_id) select gid, id from profiles where id <> auth.uid() on conflict do nothing;
  end if;
  return gid;
end $$;

create or replace function public.update_group(p_id uuid, p_name text, p_desc text, p_avatar text, p_join_mode text, p_post_mode text, p_auto_join boolean) returns void
language plpgsql security definer set search_path=public as $$
declare g groups;
begin
  if not public.is_group_admin(p_id) then raise exception 'Réservé aux administrateurs du groupe.'; end if;
  select * into g from groups where id = p_id; if not found then raise exception 'Groupe introuvable.'; end if;
  update groups set name = coalesce(nullif(left(trim(p_name),80),''), name), description = left(p_desc,500), avatar_url = coalesce(p_avatar, avatar_url),
    join_mode = case when p_join_mode in ('open','approval','invite') then p_join_mode else join_mode end,
    kind = case when g.is_general then kind when p_join_mode = 'invite' then 'private' when p_join_mode in ('open','approval') then 'public' else kind end,
    post_mode = case when g.type = 'channel' then 'admins' when p_post_mode in ('all','admins') then p_post_mode else post_mode end,
    auto_join = case when public.is_admin() then coalesce(p_auto_join, auto_join) else auto_join end
  where id = p_id;
  if public.is_admin() and coalesce(p_auto_join,false) then
    insert into group_members(group_id, user_id) select p_id, id from profiles on conflict do nothing;
  end if;
end $$;

create or replace function public.delete_group(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if exists (select 1 from groups where id = p_id and is_general) then raise exception 'Le groupe général ne peut pas être supprimé.'; end if;
  delete from groups where id = p_id;
end $$;

create or replace function public.regen_invite(p_id uuid) returns text language plpgsql security definer set search_path=public as $$
declare c text := substr(md5(random()::text||clock_timestamp()::text),1,10);
begin
  if not public.is_group_admin(p_id) then raise exception 'Réservé aux administrateurs du groupe.'; end if;
  update groups set invite_code = c where id = p_id; return c;
end $$;

-- Rejoindre : directement, ou en demande si le groupe demande une approbation
create or replace function public.join_group(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into g from groups where id = p_id; if not found then raise exception 'Groupe introuvable.'; end if;
  if exists (select 1 from group_members where group_id = p_id and user_id = auth.uid()) then return jsonb_build_object('status','joined','group_id',p_id); end if;
  if g.join_mode = 'invite' then raise exception 'Ce groupe se rejoint uniquement avec un lien d''invitation.'; end if;
  if g.join_mode = 'approval' then
    insert into join_requests(group_id, user_id) values (p_id, auth.uid()) on conflict (group_id, user_id) do update set status = 'pending', created_at = now();
    return jsonb_build_object('status','pending','group_id',p_id);
  end if;
  insert into group_members(group_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('status','joined','group_id',p_id);
end $$;

create or replace function public.join_by_code(p_code text) returns jsonb language plpgsql security definer set search_path=public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into g from groups where invite_code = trim(p_code);
  if not found then raise exception 'Lien de groupe invalide.'; end if;
  if exists (select 1 from group_members where group_id = g.id and user_id = auth.uid()) then return jsonb_build_object('status','joined','group_id',g.id); end if;
  if g.join_mode = 'approval' then
    insert into join_requests(group_id, user_id) values (g.id, auth.uid()) on conflict (group_id, user_id) do update set status = 'pending', created_at = now();
    return jsonb_build_object('status','pending','group_id',g.id);
  end if;
  insert into group_members(group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('status','joined','group_id',g.id);
end $$;

create or replace function public.review_join(p_group uuid, p_user uuid, p_ok boolean) returns void language plpgsql security definer set search_path=public as $$
declare g groups;
begin
  if not public.is_group_admin(p_group) then raise exception 'Réservé aux administrateurs du groupe.'; end if;
  select * into g from groups where id = p_group;
  update join_requests set status = case when p_ok then 'approved' else 'rejected' end where group_id = p_group and user_id = p_user and status = 'pending';
  if not found then return; end if;
  if p_ok then
    insert into group_members(group_id, user_id) values (p_group, p_user) on conflict do nothing;
    insert into notifications(user_id, type, title, body) values (p_user, 'group', 'Demande acceptée', 'Tu peux maintenant écrire dans « '||g.name||' ».');
  else
    insert into notifications(user_id, type, title, body) values (p_user, 'group', 'Demande refusée', 'Ta demande pour « '||g.name||' » n''a pas été acceptée.');
  end if;
end $$;

create or replace function public.set_member_role(p_group uuid, p_user uuid, p_role text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_group_admin(p_group) then raise exception 'Réservé aux administrateurs du groupe.'; end if;
  if p_role not in ('admin','member') then raise exception 'Rôle invalide.'; end if;
  update group_members set role = p_role where group_id = p_group and user_id = p_user and role <> 'owner';
end $$;

create or replace function public.remove_member(p_group uuid, p_user uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_group_admin(p_group) then raise exception 'Réservé aux administrateurs du groupe.'; end if;
  delete from group_members where group_id = p_group and user_id = p_user and role <> 'owner' and user_id <> auth.uid();
end $$;

create or replace function public.leave_group(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if exists (select 1 from groups where id = p_id and is_general) then raise exception 'Tu ne peux pas quitter le groupe général.'; end if;
  delete from group_members where group_id = p_id and user_id = auth.uid();
end $$;

create or replace function public.delete_message(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare m messages;
begin
  select * into m from messages where id = p_id; if not found then return; end if;
  if m.sender <> auth.uid() and not (m.group_id is not null and public.is_group_admin(m.group_id)) and not public.is_mod() then raise exception 'Action non autorisée.'; end if;
  update messages set deleted = true, pinned = false where id = p_id;
end $$;

create or replace function public.pin_message(p_id uuid, p_on boolean) returns void language plpgsql security definer set search_path=public as $$
declare m messages;
begin
  select * into m from messages where id = p_id; if not found or m.group_id is null then return; end if;
  if not public.is_group_admin(m.group_id) then raise exception 'Réservé aux administrateurs du groupe.'; end if;
  if p_on then update messages set pinned = false where group_id = m.group_id and pinned; end if;
  update messages set pinned = p_on, pinned_by = case when p_on then auth.uid() end where id = p_id;
end $$;

create or replace function public.ensure_auto_join() returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return; end if;
  insert into group_members(group_id, user_id) select id, auth.uid() from groups where auto_join or is_general on conflict do nothing;
end $$;

-- ============ 7) Inscription : profil (avec la photo Google/GitHub), portefeuille, groupes automatiques ============
create or replace function public.on_signup() returns trigger language plpgsql security definer set search_path=public as $$
declare uname text;
begin
  uname := lower(regexp_replace(coalesce(split_part(new.email,'@',1),'user'),'[^a-z0-9_]','','g'))||'_'||substr(replace(new.id::text,'-',''),1,5);
  insert into profiles(id, username, display_name, avatar_url, role, badge)
    values (new.id, uname, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
            coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
            case when lower(new.email) = 'yureijianyu@gmail.com' then 'admin' else 'member' end,
            case when lower(new.email) = 'yureijianyu@gmail.com' then 'admin' end) on conflict do nothing;
  insert into wallets(user_id) values (new.id) on conflict do nothing;
  insert into group_members(group_id, user_id) select id, new.id from groups where auto_join or is_general on conflict do nothing;
  insert into notifications(user_id, type, title, body) values (new.id, 'welcome', 'Bienvenue sur Snow Cloud Chek', 'Vous avez rejoint la communauté générale.');
  return new;
end $$;

-- Rattrapage : photos des comptes Google/GitHub déjà créés, et appartenance aux groupes automatiques
update public.profiles p set avatar_url = coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
  from auth.users u where u.id = p.id and p.avatar_url is null and coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') is not null;
insert into public.group_members(group_id, user_id) select g.id, p.id from public.groups g cross join public.profiles p where g.auto_join or g.is_general on conflict do nothing;
update public.group_members m set role = 'owner' from public.groups g, public.profiles p
  where m.group_id = g.id and m.user_id = p.id and g.created_by = p.id and m.role = 'member';

-- Messages et réactions en temps réel
do $$ begin
  begin alter publication supabase_realtime add table public.messages;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reactions; exception when duplicate_object then null; end;
end $$;
