revoke all on public.study_sessions from anon;
revoke all on public.study_sessions from authenticated;

grant select, insert, update, delete on public.study_sessions to authenticated;
