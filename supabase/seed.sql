-- TaskFlow demo seed data
-- =====================================================================
-- Run this AFTER you've signed up the demo accounts in the app, because
-- profiles are auto-created by the auth trigger when users sign up.
--
-- STEP 1 — sign up these accounts via the app (any password >= 6 chars):
--   admin@demo.com   (Full Name: Admin User)
--   priya@demo.com   (Full Name: Priya Sharma)
--   arjun@demo.com   (Full Name: Arjun Kumar)
--   sneha@demo.com   (Full Name: Sneha Patel)
--
-- STEP 2 — open Supabase Dashboard > SQL Editor and run this file.
--
-- The script is idempotent: re-running it wipes prior demo data (by name)
-- and re-creates it cleanly. Real user accounts are untouched.
-- =====================================================================

do $$
declare
  v_admin   uuid;
  v_priya   uuid;
  v_arjun   uuid;
  v_sneha   uuid;

  v_proj_web uuid;
  v_proj_app uuid;
  v_proj_mkt uuid;
  v_proj_dev uuid;
begin
  -- Look up profile IDs by email
  select id into v_admin from public.profiles where email = 'admin@demo.com';
  select id into v_priya from public.profiles where email = 'priya@demo.com';
  select id into v_arjun from public.profiles where email = 'arjun@demo.com';
  select id into v_sneha from public.profiles where email = 'sneha@demo.com';

  if v_admin is null or v_priya is null or v_arjun is null or v_sneha is null then
    raise exception 'Demo profiles missing. Sign up admin@demo.com, priya@demo.com, arjun@demo.com, sneha@demo.com first.';
  end if;

  -- Promote admin@demo.com to global admin
  update public.profiles set role = 'admin' where id = v_admin;

  -- Clean prior demo projects (cascades to members + tasks)
  delete from public.projects
   where name in ('Website Redesign','Mobile App Launch','Q2 Marketing Campaign','Internal DevTools');

  -- ============== PROJECTS ==============
  insert into public.projects (name, description, admin_id) values
    ('Website Redesign', 'Refresh the marketing site with new branding and faster load times.', v_admin)
    returning id into v_proj_web;

  insert into public.projects (name, description, admin_id) values
    ('Mobile App Launch', 'Ship the v1 iOS and Android apps to the stores.', v_priya)
    returning id into v_proj_app;

  insert into public.projects (name, description, admin_id) values
    ('Q2 Marketing Campaign', 'Multi-channel campaign for the spring product push.', v_admin)
    returning id into v_proj_mkt;

  insert into public.projects (name, description, admin_id) values
    ('Internal DevTools', 'Build the internal admin console and CI dashboards.', v_arjun)
    returning id into v_proj_dev;

  -- ============== MEMBERS ==============
  insert into public.project_members (project_id, user_id, role) values
    (v_proj_web, v_admin, 'admin'),
    (v_proj_web, v_priya, 'member'),
    (v_proj_web, v_sneha, 'member'),

    (v_proj_app, v_priya, 'admin'),
    (v_proj_app, v_arjun, 'member'),
    (v_proj_app, v_sneha, 'member'),

    (v_proj_mkt, v_admin, 'admin'),
    (v_proj_mkt, v_sneha, 'member'),

    (v_proj_dev, v_arjun, 'admin'),
    (v_proj_dev, v_priya, 'member'),
    (v_proj_dev, v_admin, 'member');

  -- ============== TASKS ==============
  -- Website Redesign
  insert into public.tasks (project_id, title, description, due_date, priority, status, assignee_id, created_by) values
    (v_proj_web, 'Finalize new homepage hero', 'Approve copy and visuals for the hero section.',
       current_date - interval '2 days', 'high', 'in_progress', v_sneha, v_admin),
    (v_proj_web, 'Migrate blog to new CMS', 'Move 80+ posts and preserve SEO redirects.',
       current_date + interval '7 days', 'medium', 'todo', v_priya, v_admin),
    (v_proj_web, 'Audit Core Web Vitals', 'Identify LCP/CLS regressions on landing pages.',
       current_date + interval '3 days', 'high', 'todo', v_sneha, v_admin),
    (v_proj_web, 'Replace stock photography', null,
       current_date - interval '5 days', 'low', 'done', v_priya, v_admin);

  -- Mobile App Launch
  insert into public.tasks (project_id, title, description, due_date, priority, status, assignee_id, created_by) values
    (v_proj_app, 'TestFlight build for v1.0', 'Cut RC1, submit for internal QA.',
       current_date + interval '1 day', 'high', 'in_progress', v_arjun, v_priya),
    (v_proj_app, 'Implement push notifications', 'Hook up FCM/APNs and add settings screen toggle.',
       current_date + interval '10 days', 'medium', 'todo', v_arjun, v_priya),
    (v_proj_app, 'Write App Store listing copy', null,
       current_date + interval '5 days', 'low', 'todo', v_sneha, v_priya),
    (v_proj_app, 'Fix crash on cold start (Android 13)', 'Repro: open app from icon after reboot.',
       current_date - interval '1 day', 'high', 'in_progress', v_arjun, v_priya);

  -- Q2 Marketing Campaign
  insert into public.tasks (project_id, title, description, due_date, priority, status, assignee_id, created_by) values
    (v_proj_mkt, 'Draft launch email sequence', '3 emails: tease, launch, follow-up.',
       current_date + interval '4 days', 'medium', 'todo', v_sneha, v_admin),
    (v_proj_mkt, 'Book influencer partnerships', null,
       current_date + interval '14 days', 'low', 'todo', v_sneha, v_admin),
    (v_proj_mkt, 'Approve paid ad budget', 'Sign off on $25k across Google + Meta.',
       current_date - interval '3 days', 'high', 'done', v_admin, v_admin);

  -- Internal DevTools
  insert into public.tasks (project_id, title, description, due_date, priority, status, assignee_id, created_by) values
    (v_proj_dev, 'SSO for admin console', 'Wire up Google Workspace SAML.',
       current_date + interval '6 days', 'high', 'in_progress', v_arjun, v_arjun),
    (v_proj_dev, 'CI dashboard MVP', 'Show last 50 builds with status + duration.',
       current_date + interval '9 days', 'medium', 'todo', v_priya, v_arjun),
    (v_proj_dev, 'Rotate database read replica', null,
       current_date - interval '4 days', 'medium', 'done', v_arjun, v_arjun);

  raise notice 'Demo seed loaded. Sign in as admin@demo.com to see all 4 projects.';
end $$;
