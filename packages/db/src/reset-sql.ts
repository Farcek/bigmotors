// Removing functions as well as tables lets the initial migration run again.
export const resetDatabaseSql = `
BEGIN;
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS drizzle CASCADE;
CREATE SCHEMA public;
COMMIT;
`;
