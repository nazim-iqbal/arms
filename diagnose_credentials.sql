-- =====================================================================
--  "new row violates row-level security policy for table user_credentials"
--  কেন হচ্ছে — এই তিনটি কুয়েরি Supabase SQL Editor-এ চালিয়ে
--  ফলাফলগুলো জানান।
-- =====================================================================

-- ১) কার কী রোল ও শাখা?
--    যে অ্যাকাউন্ট দিয়ে লগইন করে ইউজার বানাচ্ছেন, তার role কলামে
--    'super_admin' থাকতে হবে। 'admin' থাকলে সে শুধু নিজের branch_id
--    এর ইউজারই বানাতে পারবে।
SELECT user_id, name, email, role, branch_id
FROM public.users
ORDER BY role, user_id;


-- ২) user_credentials টেবিলে এখন কোন পলিসিগুলো বসানো আছে?
--    "Credentials for owner and branch admins" নামের পলিসিটি থাকতে হবে।
--    এর বদলে "Only admins can access credentials" বা
--    "Admins and owners can access credentials" দেখালে বুঝতে হবে
--    update_branches.sql এর নতুন সংস্করণটি এখনো চলেনি।
SELECT policyname, cmd, qual AS using_clause, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_credentials';


-- ৩) হেল্পার ফাংশনগুলো তৈরি হয়েছে কি না
--    ছয়টি নামই তালিকায় থাকা চাই।
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_super_admin', 'is_admin', 'can_manage_branch',
                    'branch_of_user', 'current_branch_id', 'current_role_name')
ORDER BY p.proname;
