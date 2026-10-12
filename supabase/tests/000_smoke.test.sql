begin;
create extension if not exists pgtap with schema extensions;
select plan(2);
select has_schema('public');
select hasnt_table('public', 'todos', 'todo table is gone');
select * from finish();
rollback;
