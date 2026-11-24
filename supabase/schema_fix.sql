-- Snow Cloud Chek — RÉPARATION : code de parrainage + diagnostic. Peut être relancé sans danger.
-- À exécuter dans le SQL Editor de Supabase. Le tableau final indique ce qui est installé (true) ou manquant (false).

-- 1) Parrainage (colonnes, codes pour tous les membres, protection, fonctions)
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
update public.profiles set referral_code = upper(substr(md5(id::text||'snow'),1,8)) where referral_code is null;
create unique index if not exists profiles_referral_code_key on public.profiles(referral_code);
alter table public.profiles alter column referral_code set default upper(substr(md5(random()::text||clock_timestamp()::text),1,8));

create or replace function public.guard_profile_fields() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and coalesce(current_setting('snow.allow_ref', true),'') <> '1' then
    new.referral_code := old.referral_code;
    new.referred_by   := old.referred_by;
  end if;
  return new;
end $$;
drop trigger if exists t_guard_profile on public.profiles;
create trigger t_guard_profile before update on public.profiles for each row execute function public.guard_profile_fields();

-- Génère (si besoin) et renvoie le code de l'utilisateur connecté.
create or replace function public.ensure_referral_code() returns text language plpgsql security definer set search_path=public as $$
declare c text;
begin
  if auth.uid() is null then return null; end if;
  select referral_code into c from profiles where id = auth.uid();
  if c is null then
    c := upper(substr(md5(auth.uid()::text||clock_timestamp()::text),1,8));
    perform set_config('snow.allow_ref', '1', true);
    update profiles set referral_code = c where id = auth.uid();
  end if;
  return c;
end $$;

create table if not exists public.ref_clicks(user_id uuid references public.profiles(id) on delete cascade, day date not null, n int not null default 0, primary key(user_id, day));
alter table public.ref_clicks enable row level security;
drop policy if exists rc_own on public.ref_clicks;
create policy rc_own on public.ref_clicks for select using (user_id = auth.uid() or public.is_admin());
create or replace function public.track_ref_click(p_code text) returns void language plpgsql security definer set search_path=public as $$
declare u uuid;
begin
  select id into u from profiles where referral_code = upper(trim(p_code));
  if u is null then return; end if;
  insert into ref_clicks(user_id, day, n) values (u, current_date, 1) on conflict (user_id, day) do update set n = ref_clicks.n + 1;
end $$;
grant execute on function public.track_ref_click(text) to anon, authenticated;

create or replace function public.apply_referral(p_code text) returns text language plpgsql security definer set search_path=public as $$
declare v_me profiles; r uuid;
begin
  if auth.uid() is null then return 'auth'; end if;
  select * into v_me from profiles where id = auth.uid();
  if not found then return 'auth'; end if;
  if v_me.referred_by is not null then return 'already'; end if;
  if v_me.created_at < now() - interval '3 days' then return 'too_late'; end if;
  select id into r from profiles where referral_code = upper(trim(p_code));
  if r is null then return 'invalid'; end if;
  if r = v_me.id then return 'self'; end if;
  perform set_config('snow.allow_ref', '1', true);
  update profiles set referred_by = r where id = v_me.id;
  insert into notifications(user_id, type, title, body) values (r, 'referral', 'Nouveau filleul', 'Un membre vient de s''inscrire avec votre lien.');
  return 'ok';
end $$;

-- 2) Diagnostic : que contient la base ?
select element, present from (
  select 1 as o, 'Lot 2 · colonne profiles.referral_code' as element, exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='referral_code') as present
  union all select 2, 'Lot 2 · table app_settings (réglages des gains)', to_regclass('public.app_settings') is not null
  union all select 3, 'Lot 2 · table tasks (missions)', to_regclass('public.tasks') is not null
  union all select 4, 'Lot 2 · fonction award_check (gains automatiques)', exists(select 1 from pg_proc where proname='award_check')
  union all select 5, 'Lot 2 · fonction request_withdrawal2 (retraits)', exists(select 1 from pg_proc where proname='request_withdrawal2')
  union all select 6, 'Lot 3 · colonne groups.type (chaînes)', exists(select 1 from information_schema.columns where table_schema='public' and table_name='groups' and column_name='type')
  union all select 7, 'Lot 3 · fonction create_group', exists(select 1 from pg_proc where proname='create_group')
  union all select 8, 'Lot 3 · table chat_reads (messages lus)', to_regclass('public.chat_reads') is not null
  union all select 9, 'Parrainage · fonction ensure_referral_code', exists(select 1 from pg_proc where proname='ensure_referral_code')
  union all select 10, 'Membres sans code de parrainage (doit être false)', exists(select 1 from public.profiles where referral_code is null)
) t order by o;
