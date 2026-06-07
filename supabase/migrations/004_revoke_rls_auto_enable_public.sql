-- The PUBLIC pseudo-role (empty grantee in pg_proc.proacl, shown as "=X/postgres")
-- still had EXECUTE on rls_auto_enable, which is why the advisor kept firing
-- even after revoking from anon/authenticated. Revoke from PUBLIC explicitly.
revoke execute on function public.rls_auto_enable() from public;
