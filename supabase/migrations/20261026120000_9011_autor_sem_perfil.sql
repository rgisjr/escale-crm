-- manifest: **Nome do autor sem perfil (fork Escale, Fase 1H-C).** O carimbo de autoria das notas e dos arquivos (`fn_escale_carimbar_autoria`, 9008) gravava `user_nome` NULO quando o perfil de quem grava não tem `full_name`, e a ficha mostrava "?" no avatar. Agora cai para a parte local do e-mail da própria sessão (`fulano@x.com` → `fulano`), lida de `auth.users` — nunca do valor que veio no INSERT, que reabriria a falsificação do autor. Só redefine a função (`create or replace`, mesma assinatura): tabelas, gatilhos e grants da 9008 ficam como estão.
-- 9011: o nome do autor sem perfil cai para o e-mail (fork Escale).

create or replace function public.fn_escale_carimbar_autoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $f$
begin
  new.created_at := now();
  if auth.uid() is not null then
    new.user_nome := (
      select coalesce(
               nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
               nullif(split_part(coalesce(u.email, ''), '@', 1), '')
             )
        from auth.users u
       where u.id = auth.uid()
    );
  end if;
  return new;
end;
$f$;

revoke execute on function public.fn_escale_carimbar_autoria() from public, anon, authenticated;

notify pgrst, 'reload schema';
