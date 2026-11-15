-- Step 1 of 2 for the Principal role. Run this ALONE (its own query), then run 017_principal_access.sql as a new query.
-- A new enum value cannot be used in the same transaction that adds it, which is why this is a separate file.
alter type ss_user_role add value if not exists 'principal';
