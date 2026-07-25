-- =============================================================
-- Public Invoice Verification —anon SELECT policy
-- شغّله من: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

-- سياسة تسمح للـ anon (غير المسجل) بقراءة الفواتور للتحقق
-- это يسمح بصفحة التحقق العامة: /invoice/verify/$invoiceNumber
DO $$
BEGIN
  -- Drop old permissive anon policy if it exists (replaces it)
  DROP POLICY IF EXISTS "Allow all for anon" ON invoices;

  -- Allow anon SELECT only (no INSERT/UPDATE/DELETE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public invoice read'
      AND tablename = 'invoices'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Public invoice read"
      ON invoices
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- تأكيد
SELECT '✅ Public invoice read policy created!' AS result;
