-- Snow Cloud Chek — LOT 2 : gains en points, devise USD/FCFA, missions, retraits, parrainage.
-- À exécuter dans le SQL Editor APRÈS schema.sql, schema_part2.sql et schema_part3.sql.
-- Peut être relancé sans danger (idempotent).

-- ============ 0) Précision monétaire et retraits ============
alter table public.wallets     alter column balance type numeric(12,4), alter column total_earned type numeric(12,4);
alter table public.rewards     alter column amount type numeric(12,4);
alter table public.withdrawals alter column amount type numeric(12,4);
alter table public.withdrawals drop constraint if exists withdrawals_amount_check;
alter table public.withdrawals drop constraint if exists withdrawals_amount_pos;
alter table public.withdrawals add constraint withdrawals_amount_pos check (amount > 0);
alter table public.withdrawals add column if not exists currency text default 'USD';
alter table public.withdrawals add column if not exists amount_local numeric(14,2);
alter table public.withdrawals add column if not exists qr_url text;
alter table public.withdrawals add column if not exists reviewed_by uuid;

-- ============ 1) Réglages modifiables par l'admin ============
create table if not exists public.app_settings(key text primary key, value jsonb not null, updated_at timestamptz default now());
alter table public.app_settings enable row level security;
drop policy if exists st_read on public.app_settings;
create policy st_read on public.app_settings for select using (auth.uid() is not null);
drop policy if exists st_admin on public.app_settings;
create policy st_admin on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings(key, value) values
 ('rates',   '{"fcfa_per_usd":600,"fcfa_per_pt":10}'),
 ('rewards', '{"pts_active":9,"pts_banned":15,"cooldown_days":30,"daily_cap_pts":60,"ref_bonus_pts":50,"ref_after_checks":5,"tiers":[{"actives":10,"bonus_pts":500}]}'),
 ('withdraw','{"min_usd":25,"methods":[
    {"id":"wave","name":"Wave","kind":"phone","active":true},
    {"id":"orange","name":"Orange Money","kind":"phone","active":true},
    {"id":"mtn","name":"MTN MoMo","kind":"phone","active":true},
    {"id":"moov","name":"Moov Money","kind":"phone","active":false},
    {"id":"binance","name":"Binance","kind":"crypto","active":true},
    {"id":"usdt","name":"USDT","kind":"crypto","active":true},
    {"id":"wallet","name":"Wallet crypto","kind":"crypto","active":true}]}')
on conflict (key) do nothing;

create or replace function public.cfg(k text) returns jsonb language sql stable security definer set search_path=public as $$
  select value from public.app_settings where key = k $$;

-- ============ 2) Parrainage ============
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
update public.profiles set referral_code = upper(substr(md5(id::text||'snow'),1,8)) where referral_code is null;
create unique index if not exists profiles_referral_code_key on public.profiles(referral_code);
alter table public.profiles alter column referral_code set default upper(substr(md5(random()::text||clock_timestamp()::text),1,8));

-- Le client ne peut pas modifier son code de parrainage ni son parrain (uniquement via apply_referral).
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

create or replace function public.my_referrals() returns table(id uuid, username text, display_name text, avatar_url text, created_at timestamptz, paid_checks bigint, active boolean)
language sql stable security definer set search_path=public as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.created_at,
         (select count(*) from rewards r where r.user_id = p.id and r.kind in ('check_ok','check_ban')),
         exists (select 1 from rewards r where r.kind = 'referral' and r.ref_user = p.id and r.user_id = auth.uid())
  from profiles p where p.referred_by = auth.uid() order by p.created_at desc limit 100 $$;

-- ============ 3) Missions ============
create table if not exists public.tasks(
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  kind text not null check (kind in ('join_group','checks_today','daily_login','invite_friends','link','proof')),
  points int not null check (points > 0), repeat text not null default 'once' check (repeat in ('once','daily')),
  target int not null default 1, url text, group_id uuid references public.groups on delete set null,
  active boolean not null default true, sort int default 0, created_at timestamptz default now());
alter table public.tasks enable row level security;
drop policy if exists tk_read on public.tasks;
create policy tk_read on public.tasks for select using (auth.uid() is not null and (active or public.is_admin()));
drop policy if exists tk_admin on public.tasks;
create policy tk_admin on public.tasks for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.task_claims(
  id uuid primary key default gen_random_uuid(), task_id uuid references public.tasks on delete cascade, user_id uuid references public.profiles on delete cascade,
  day date not null, status text not null default 'approved' check (status in ('pending','approved','rejected')),
  proof_url text, note text, created_at timestamptz default now());
create unique index if not exists task_claims_once on public.task_claims(task_id, user_id, day) where status in ('pending','approved');
alter table public.task_claims enable row level security;
drop policy if exists tc_own on public.task_claims;
create policy tc_own on public.task_claims for select using (user_id = auth.uid() or public.is_admin());

alter table public.rewards add column if not exists kind text not null default 'check_ok';
alter table public.rewards add column if not exists ref_user uuid;
alter table public.rewards add column if not exists task_id uuid;
alter table public.rewards add column if not exists meta text;
drop index if exists public.one_reward_per_number;
create index if not exists rewards_number_idx on public.rewards(number_hash, created_at desc);
create unique index if not exists one_referral_bonus on public.rewards(ref_user) where kind = 'referral';
create unique index if not exists one_tier_bonus on public.rewards(user_id, meta) where kind = 'referral_tier';

insert into public.tasks(title, description, kind, points, repeat, target, sort)
  select 'Connexion quotidienne', 'Reviens chaque jour', 'daily_login', 5, 'daily', 1, 1
  where not exists (select 1 from public.tasks);
insert into public.tasks(title, description, kind, points, repeat, target, sort)
  select 'Vérifier 5 numéros', 'Cinq vérifications récompensées dans la journée', 'checks_today', 30, 'daily', 5, 2
  where (select count(*) from public.tasks) = 1;
insert into public.tasks(title, description, kind, points, repeat, target, sort)
  select 'Inviter un ami actif', 'Quand ton filleul a fait ses premières vérifications', 'invite_friends', 100, 'once', 1, 3
  where (select count(*) from public.tasks) = 2;

-- ============ 4) Crédit interne (jamais appelable par un client) ============
create or replace function public.credit_usd(p_user uuid, p_usd numeric, p_kind text, p_task uuid default null, p_ref uuid default null, p_hash text default null, p_meta text default null) returns numeric
language plpgsql security definer set search_path=public as $$
declare bal numeric;
begin
  insert into wallets(user_id) values (p_user) on conflict do nothing;
  insert into rewards(user_id, number_hash, amount, status, kind, task_id, ref_user, meta) values (p_user, p_hash, p_usd, 'approved', p_kind, p_task, p_ref, p_meta);
  update wallets set balance = balance + p_usd, total_earned = total_earned + p_usd where user_id = p_user returning balance into bal;
  return bal;
end $$;
revoke all on function public.credit_usd(uuid, numeric, text, uuid, uuid, text, text) from public, anon, authenticated;

-- ============ 5) Gains des vérifications (appelés UNIQUEMENT par le serveur Cloudflare) ============
-- Les montants, plafonds et délais viennent des réglages (app_settings) que l'admin modifie dans l'application.
create or replace function public.award_check(p_user uuid, p_number text, p_status text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  r jsonb := cfg('rewards'); rt jsonb := cfg('rates');
  k numeric := (rt->>'fcfa_per_pt')::numeric / (rt->>'fcfa_per_usd')::numeric;   -- USD par point
  pts numeric; amt numeric; h text; used numeric; rb uuid; bal numeric; n int; tier jsonb; ref_pts numeric;
begin
  if p_status not in ('not_banned','banned') then return jsonb_build_object('status','none'); end if;
  if not exists (select 1 from profiles where id = p_user and not suspended) then return jsonb_build_object('status','none'); end if;
  insert into wallets(user_id) values (p_user) on conflict do nothing;
  h := encode(sha256(convert_to('snow:'||p_number, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtext(h));
  perform pg_advisory_xact_lock(hashtext('u:'||p_user::text));
  if exists (select 1 from rewards where number_hash = h and kind in ('check_ok','check_ban')
             and created_at > now() - ((r->>'cooldown_days')::int * interval '1 day')) then
    return jsonb_build_object('status','cooldown');
  end if;
  pts := case when p_status = 'banned' then (r->>'pts_banned')::numeric else (r->>'pts_active')::numeric end;
  amt := pts * k;
  select coalesce(sum(amount),0) into used from rewards where user_id = p_user and kind in ('check_ok','check_ban') and created_at >= date_trunc('day', now());
  if used + amt > (r->>'daily_cap_pts')::numeric * k + 0.00001 then
    return jsonb_build_object('status','cap','limit_pts',(r->>'daily_cap_pts')::numeric);
  end if;
  bal := credit_usd(p_user, amt, case when p_status = 'banned' then 'check_ban' else 'check_ok' end, null, null, h);
  -- parrainage : bonus au parrain quand le filleul atteint N vérifications payées
  select referred_by into rb from profiles where id = p_user;
  if rb is not null then
    select count(*) into n from rewards where user_id = p_user and kind in ('check_ok','check_ban');
    if n = (r->>'ref_after_checks')::int and not exists (select 1 from rewards where kind = 'referral' and ref_user = p_user) then
      ref_pts := (r->>'ref_bonus_pts')::numeric;
      perform credit_usd(rb, ref_pts * k, 'referral', null, p_user);
      insert into notifications(user_id, type, title, body) values (rb, 'referral', 'Bonus de parrainage', '+'||ref_pts||' points : votre filleul est actif.');
      select count(*) into n from rewards where user_id = rb and kind = 'referral';
      for tier in select * from jsonb_array_elements(coalesce(r->'tiers','[]'::jsonb)) loop
        if n = (tier->>'actives')::int and not exists (select 1 from rewards where user_id = rb and kind = 'referral_tier' and meta = (tier->>'actives')) then
          perform credit_usd(rb, (tier->>'bonus_pts')::numeric * k, 'referral_tier', null, null, null, tier->>'actives');
          insert into notifications(user_id, type, title, body) values (rb, 'referral', 'Palier atteint', '+'||(tier->>'bonus_pts')||' points : '||(tier->>'actives')||' filleuls actifs.');
        end if;
      end loop;
    end if;
  end if;
  return jsonb_build_object('status','credited','points',pts,'amount',amt,'balance',bal,'kind',case when p_status = 'banned' then 'banned' else 'active' end);
end $$;
revoke all on function public.award_check(uuid, text, text) from public, anon, authenticated;
grant execute on function public.award_check(uuid, text, text) to service_role;

-- L'ancienne récompense (validation admin) est désactivée.
create or replace function public.claim_reward(p_check uuid) returns text language sql security definer set search_path=public as $$ select 'not_eligible'::text $$;

-- ============ 6) Missions : réclamer / valider ============
create or replace function public.claim_task(p_task uuid, p_proof text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t tasks; d date; rt jsonb := cfg('rates'); k numeric; n int; st text := 'approved'; usd numeric; bal numeric;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into t from tasks where id = p_task and active;
  if not found then raise exception 'Mission introuvable'; end if;
  if exists (select 1 from profiles where id = auth.uid() and suspended) then raise exception 'Compte suspendu'; end if;
  d := case when t.repeat = 'daily' then current_date else date '1970-01-01' end;
  perform pg_advisory_xact_lock(hashtext('task:'||auth.uid()::text||p_task::text));
  if exists (select 1 from task_claims where task_id = t.id and user_id = auth.uid() and day = d and status in ('pending','approved')) then
    raise exception 'Mission déjà réclamée';
  end if;
  k := (rt->>'fcfa_per_pt')::numeric / (rt->>'fcfa_per_usd')::numeric;
  if t.kind = 'join_group' then
    if t.group_id is null then raise exception 'Groupe non configuré'; end if;
    insert into group_members(group_id, user_id) values (t.group_id, auth.uid()) on conflict do nothing;
  elsif t.kind = 'checks_today' then
    select count(*) into n from rewards where user_id = auth.uid() and kind in ('check_ok','check_ban') and created_at >= date_trunc('day', now());
    if n < t.target then raise exception 'Il te manque % vérification(s) récompensée(s) aujourd’hui', t.target - n; end if;
  elsif t.kind = 'invite_friends' then
    select count(*) into n from rewards where user_id = auth.uid() and kind = 'referral';
    if n < t.target then raise exception 'Il te manque % filleul(s) actif(s)', t.target - n; end if;
  elsif t.kind = 'proof' then
    if coalesce(p_proof,'') = '' then raise exception 'Une capture d’écran est requise'; end if;
    st := 'pending';
  end if;
  insert into task_claims(task_id, user_id, day, status, proof_url) values (t.id, auth.uid(), d, st, left(p_proof, 500));
  if st = 'approved' then
    usd := t.points * k;
    bal := credit_usd(auth.uid(), usd, 'task', t.id);
    return jsonb_build_object('status','credited','points',t.points,'amount',usd,'balance',bal);
  end if;
  return jsonb_build_object('status','pending');
end $$;

create or replace function public.review_task_claim(p_id uuid, p_ok boolean, p_note text default null) returns void
language plpgsql security definer set search_path=public as $$
declare c task_claims; t tasks; rt jsonb := cfg('rates'); k numeric;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into c from task_claims where id = p_id for update;
  if not found or c.status <> 'pending' then raise exception 'Déjà traitée'; end if;
  select * into t from tasks where id = c.task_id;
  k := (rt->>'fcfa_per_pt')::numeric / (rt->>'fcfa_per_usd')::numeric;
  if p_ok then
    perform credit_usd(c.user_id, t.points * k, 'task', t.id);
    update task_claims set status = 'approved', note = p_note where id = p_id;
    insert into notifications(user_id, type, title, body) values (c.user_id, 'task', 'Mission validée', '+'||t.points||' points : '||t.title);
  else
    update task_claims set status = 'rejected', note = p_note where id = p_id;
    insert into notifications(user_id, type, title, body) values (c.user_id, 'task', 'Mission refusée', coalesce(p_note, t.title));
  end if;
  insert into audit_log(actor, action, target) values (auth.uid(), 'task_claim:'||case when p_ok then 'ok' else 'no' end, p_id::text);
end $$;

-- ============ 7) Retraits en USD ou FCFA ============
create or replace function public.request_withdrawal2(p_amount_local numeric, p_currency text, p_method text, p_details text, p_qr text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare w uuid; rt jsonb := cfg('rates'); wd jsonb := cfg('withdraw'); usd numeric; minu numeric := coalesce((wd->>'min_usd')::numeric, 25); m jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if p_currency not in ('USD','FCFA') then raise exception 'Devise invalide'; end if;
  if p_amount_local is null or p_amount_local <= 0 then raise exception 'Montant invalide'; end if;
  usd := round(case when p_currency = 'USD' then p_amount_local else p_amount_local / (rt->>'fcfa_per_usd')::numeric end, 4);
  if usd < minu then raise exception 'Retrait minimum : % USD', minu; end if;
  select e into m from jsonb_array_elements(coalesce(wd->'methods','[]'::jsonb)) e where e->>'id' = p_method and coalesce((e->>'active')::boolean, true) limit 1;
  if m is null then raise exception 'Moyen de retrait indisponible'; end if;
  if length(coalesce(trim(p_details),'')) < 5 then raise exception 'Coordonnées manquantes'; end if;
  if (select count(*) from withdrawals where user_id = auth.uid() and status in ('pending','processing')) >= 3 then raise exception 'Trop de retraits en cours'; end if;
  update wallets set balance = balance - usd where user_id = auth.uid() and balance >= usd;
  if not found then raise exception 'Solde insuffisant'; end if;
  insert into withdrawals(user_id, amount, method, details, currency, amount_local, qr_url)
    values (auth.uid(), usd, p_method, left(p_details, 300), p_currency, round(p_amount_local, 2), left(p_qr, 500)) returning id into w;
  return w;
end $$;

create or replace function public.admin_review_withdrawal(p_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path=public as $$
declare w withdrawals;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('processing','approved','rejected','paid') then raise exception 'Statut invalide'; end if;
  select * into w from withdrawals where id = p_id for update;
  if not found then return; end if;
  if w.status in ('rejected','paid') then raise exception 'Statut final'; end if;
  if p_status = 'rejected' then update wallets set balance = balance + w.amount where user_id = w.user_id; end if;
  update withdrawals set status = p_status, note = p_note, reviewed_by = auth.uid() where id = p_id;
  insert into notifications(user_id, type, title, body)
    values (w.user_id, 'withdrawal', 'Retrait : '||case p_status when 'paid' then 'payé' when 'rejected' then 'refusé' when 'processing' then 'en cours' else 'approuvé' end,
            coalesce(w.amount_local::text||' '||w.currency, w.amount::text||' USD')||coalesce(' — '||p_note, ''));
  insert into audit_log(actor, action, target) values (auth.uid(), 'withdrawal:'||p_status, p_id::text);
end $$;
