-- =============================================================
-- Fix: Allow anon full access to invoices (SELECT + INSERT + UPDATE)
-- السائق مو مسجل في Supabase Auth، يعتبر anon
-- شغّله من: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

-- حذف السياسات القديمة على invoices
DROP POLICY IF EXISTS "Allow all for anon" ON invoices;
DROP POLICY IF EXISTS "Public invoice read" ON invoices;
DROP POLICY IF EXISTS "Authenticated full access" ON invoices;

-- سياسة واحدة:سمح لكل شي للـ anon (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Full anon access"
  ON invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

SELECT '✅ Invoices: full anon access restored!' AS result;
