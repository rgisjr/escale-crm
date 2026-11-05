# Plano: ambiente de teste (teste.escaleia.com) e bateria no GitHub

> Decisões do usuário, 03/11/2026. Este plano NÃO está autorizado para execução: só roda quando o usuário mandar.
> Nada de bateria de testes durante a montagem (pedido dele). As peças são conferidas abrindo o site, não rodando a suíte.

## Objetivo

Toda mudança passa primeiro por uma **versão de teste** do app, separada da produção. O usuário olha lá e só depois diz "pode publicar". O app dos clientes (`app.escaleia.com`) nunca muda antes desse OK.

## Fluxo novo

1. Claude termina a frente, abre o PR e mergeia na `main` (como hoje).
2. O GitHub roda a bateria inteira numa máquina dele (Fase 4). Nada roda no PC do usuário nem na VPS de produção.
3. A imagem nova (`publish-image.yml`, já ativo) vai sozinha para `teste.escaleia.com`.
4. Claude avisa: "está no teste, olha X e Y".
5. Usuário confere e diz **"pode publicar"**.
6. Claude cria a tag/release, faz `backup.sh` e `update.sh --to <tag>` na produção (como hoje).

**Exceção decidida:** nenhuma ainda. Correção urgente também passa pelo teste, a menos que o usuário diga o contrário.

## Fase 1 — Banco de teste (Supabase)

1. Listar os projetos Supabase da conta (só leitura) e achar o banco da "versão 1" que o usuário citou.
2. Se existir e não tiver dado real de cliente: **reaproveitar**, apagando o conteúdo e reaplicando as migrations do zero. Se tiver dado real: perguntar antes de apagar.
3. Se não existir: criar projeto novo no plano grátis, região São Paulo, nome `escale-crm-teste`.
4. Aplicar todas as migrations. Criar só dados inventados: 1 organização "Empresa Teste", 1 usuário de teste, funil com etapas, uns 20 contatos e negócios fictícios. **Nenhum dado real copiado (LGPD).**
5. O projeto de produção `jsrzgxyioczdgwiklkrc` não é tocado.

## Fase 2 — Endereço `teste.escaleia.com`

1. Usuário cria o registro DNS tipo A `teste` → `76.13.228.29` no painel onde gerencia o domínio (Claude manda o passo a passo com prints do painel que ele usar).
2. O Traefik da VPS já emite o certificado HTTPS sozinho pelos rótulos do container (sem mexer na configuração do Traefik, que é proibido).

## Fase 3 — App de teste na VPS

1. Pasta separada na VPS: `/opt/escale-teste` (a produção continua na pasta atual, sem alteração).
2. Compose próprio só com: **app + scheduler + redis próprio**. Sem worker de envio, **sem WAHA (WhatsApp)**.
3. Variáveis apontando para o banco de teste. Chaves de WhatsApp, Instagram, Meta, e-mail e IA ficam **vazias ou falsas**: nada sai para cliente real.
4. Limites de memória: app 512 MB, scheduler 128 MB, redis 64 MB. Hoje a VPS tem 4,8 GB livres; sobra folga para a produção.
5. Rede e nomes próprios (`escale_teste_*`). Proibido usar `postgres_postgres`, a rede `todanet`, n8n, evolution, portainer.
6. Atualização automática: um script na VPS puxa a imagem `:main` mais nova e reinicia só o app de teste (disparado pelo GitHub após o `publish-image`, ou a cada 5 min por cron). Escolha na execução, a mais simples que funcionar.
7. Faixa no topo do app de teste: "AMBIENTE DE TESTE" (por variável de ambiente; não aparece na produção).

## Fase 4 — Bateria no GitHub

Descoberta (03/11): o `ci.yml` **já existe** e roda typecheck, lint, cercas e a suíte unitária dividida em 3 partes, mas está **desligado à mão** no GitHub (junto com e2e, perf, release e acolhida). Só o `publish-image` está ativo.

1. Religar o `ci.yml` (sem rodar agora). Conferir se ele espera o executor próprio (`EXECUTOR_PROPRIO`); se sim, deixar no `ubuntu-latest` do GitHub.
2. Ele passa a rodar sozinho em cada PR e na `main`. Vermelho = Claude corrige antes de pedir o "pode publicar".
3. `e2e` e `perf` continuam desligados por enquanto (decidir depois).
4. Custo: repositório privado tem 2.000 min/mês grátis no GitHub. Medir o consumo na primeira semana e avisar se passar.

## Fase 5 — Atualizar as regras do projeto

1. `CLAUDE.md`: a seção "A ENTREGA ATÉ PRODUÇÃO É DO CLAUDE" muda para: Claude publica sozinho **no teste**; **produção só depois do "pode publicar" do usuário**. A bateria inteira roda no GitHub, nunca no PC dele.
2. Memória: atualizar `entrega-ate-producao-e-minha` e `testes-custo-beneficio`; nova memória do ambiente de teste (endereço, pasta, banco).
3. `LOG.md`: registrar o ambiente de teste.

## O que o usuário precisa fazer

- Criar o registro DNS `teste` (Fase 2), com o passo a passo do Claude.
- Se o banco novo precisar ser criado na conta dele, autorizar no Supabase.
- Depois de pronto: entrar em `teste.escaleia.com` com o usuário de teste e conferir.

## Riscos e cuidados

- **Envio real por engano:** mitigado por não subir worker/WAHA e deixar as chaves vazias.
- **Memória da VPS:** limites fixos por container; se a produção apertar, o teste é o primeiro a ser desligado.
- **Disco:** imagens antigas do teste são apagadas a cada atualização (lição da VPS antiga com disco cheio).
- **Banco grátis pausa após 7 dias sem uso:** se pausar, Claude reativa antes de usar.

## Pronto quando

- `teste.escaleia.com` abre com HTTPS, login de teste funciona, faixa "AMBIENTE DE TESTE" visível.
- Merge na `main` atualiza o teste sozinho.
- `ci.yml` ativo no GitHub.
- Produção intacta: 3 containers healthy, `/login` 200.
- CLAUDE.md, memória e LOG atualizados.
