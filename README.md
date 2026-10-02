# Sorteio de livros · Rede Episcopal Brasileira

Página de inscrição e painel do sorteio da **2ª Conferência Teológica da REB**, em **3 de outubro de 2026, das 8h às 12h, horário de Brasília**. O nome do repositório contém `2027`, mas a data configurada no aplicativo é 2026.

- **Endereço público:** [sorteio.redeepiscopalbrasileira.com.br](https://sorteio.redeepiscopalbrasileira.com.br)
- **Admin:** `/admin/login` · e-mail `dev@dodopok.dev`
- **Tela para compartilhar na live:** `/admin/palco`
- **Ensaio sem dados reais:** `/ensaio`

## Se você já subiu na Railway

Confira estes pontos antes de divulgar o QR Code:

1. Aplicação e PostgreSQL estão no **mesmo projeto e ambiente**, na mesma região, usando a URL privada do banco.
2. O serviço da aplicação usa o **Dockerfile deste repositório**, com porta `3000`.
3. O comando de pré-deploy é `node scripts/migrate.mjs`. Ele cria o banco da aplicação e pode rodar novamente sem apagar inscrições ou resultados.
4. As variáveis da tabela abaixo estão preenchidas. A senha de teste local **não deve ser usada na live**.
5. O healthcheck `/api/health` retorna `{"ok":true}`. Um `503` indica configuração ou banco indisponível; veja a seção de problemas.
6. O domínio está configurado, com HTTPS, e `NUXT_PUBLIC_SITE_URL` corresponde ao endereço usado pelas pessoas.
7. O Turnstile está configurado para esse domínio e aparece no formulário.
8. Você consegue entrar no painel, abrir as inscrições e fazer um cadastro pelo celular.
9. Você ensaiou a apresentação em `/ensaio`. **Não clique em “Sortear agora” no sorteio real para testar**: a escolha fica gravada.
10. O banco de produção não contém participantes ou ganhadores fictícios. Use um projeto/ambiente separado para testes completos.

## Como funciona

O participante informa nome completo, WhatsApp com DDD e e-mail. Confirma que tem 18 anos ou mais, reside no Brasil e aceita o regulamento e o uso dos dados para este sorteio.

O evento começa com as inscrições fechadas (`draft`). A organização abre e encerra pelo painel. Após o encerramento, cada rodada seleciona uma pessoa que ainda não ganhou:

| Rodada | Prêmio | Conteúdo / autor |
| --- | --- | --- |
| 1 | Toda a Escritura é… | Michael F. Bird |
| 2 | Religião estranha | Nijay Gupta |
| 3 | Jesus e os poderes | N. T. Wright e Michael F. Bird |
| 4 | Kit Anglicano | O Caminho Anglicano, de Thomas McKenzie; caneca “Seja anglicano gostoso demais”; um item surpresa |

São **quatro ganhadores diferentes, um prêmio por pessoa**. A Thomas Nelson Brasil envia os três livros das primeiras rodadas. A **REB envia o Kit Anglicano**, completo, para o quarto ganhador. O livro embrulhado no mockup representa o item surpresa; a imagem não revela o que será enviado. A inscrição não exige compra, pagamento, doação ou resposta imediata no chat.

O resultado é escolhido no servidor e salvo no PostgreSQL **antes da animação**. A roleta de primeiros nomes apenas apresenta a escolha: os nomes permanecem fixos nos cartões desde o início, ela para no primeiro nome do ganhador e então revela o nome completo. Cliques repetidos reutilizam o identificador da mesma operação, e duas telas não conseguem sortear o mesmo prêmio simultaneamente. Recarregar a página recupera o resultado salvo.

Antes da primeira rodada é possível reabrir as inscrições. Depois que um prêmio é sorteado, o sistema impede a reabertura. O encerramento exige pelo menos quatro inscrições, para permitir os quatro prêmios. Não há botão para trocar um ganhador. O reset com confirmação apaga todas as inscrições e resultados, e deve ser usado apenas para limpar testes antes do evento.

### Atualização para quatro prêmios

A migração executada no pré-deploy da Railway amplia o limite do banco para quatro rodadas e preserva inscrições, sessões e resultados existentes. **Não é preciso resetar o banco para adicionar o kit.** Se já houver três resultados salvos, o próximo sorteio será o kit; os três ganhadores anteriores não concorrem novamente. Em desenvolvimento local, execute `npm run db:migrate` antes de abrir a nova versão.

Após o deployment, atualize as abas do painel, do palco e da página pública. Confira os quatro prêmios em `/admin` e ensaie as quatro rodadas em `/ensaio`. Para apagar dados fictícios antes da live, use o reset descrito abaixo; não use essa função para fazer a atualização do quarto prêmio.

## Variáveis de ambiente

Configure as variáveis no serviço **da aplicação**, na Railway. Elas são lidas em tempo de execução. Após alterá-las, publique o novo deployment/reinicie o serviço.

| Variável | Valor ou finalidade |
| --- | --- |
| `NUXT_DATABASE_URL` | Referência a `${{Postgres.DATABASE_URL}}`. Deve apontar ao host privado `*.railway.internal`, não à URL pública/proxy TCP. Ajuste `Postgres` se o serviço tiver outro nome. |
| `NUXT_ADMIN_EMAIL` | `dev@dodopok.dev` |
| `NUXT_ADMIN_PASSWORD_HASH` | Hash `scrypt` gerado com `npm run admin:setup`. Não é a senha em texto. |
| `NUXT_IP_HASH_SECRET` | Segredo aleatório gerado pelo mesmo comando; mínimo de 32 caracteres. |
| `NUXT_TURNSTILE_SECRET_KEY` | Chave secreta do widget Cloudflare Turnstile. |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | Chave pública do mesmo widget. |
| `NUXT_PUBLIC_SITE_URL` | `https://sorteio.redeepiscopalbrasileira.com.br`, sem barra final. Para testar com outro domínio, use o endereço real do teste. |
| `NUXT_PUBLIC_ORGANIZER_NAME` | `Rede Episcopal Brasileira` |
| `NUXT_PUBLIC_ORGANIZER_CNPJ` | Opcional no código. Preencha com o CNPJ correto, caso aplicável, após confirmar a identificação do organizador. |
| `NUXT_PUBLIC_PRIVACY_EMAIL` | Contato público para dúvidas e pedidos sobre dados. Atualmente `dev@dodopok.dev`; confirme que este e-mail será atendido. |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

As variáveis `NUXT_PUBLIC_*` são visíveis ao navegador. Nunca coloque senha, URL de banco, hash da senha ou chave secreta do Turnstile nelas. `.env` está ignorado pelo Git e excluído da imagem Docker.

### Gerar o acesso administrativo

Na sua máquina, com as dependências instaladas:

```bash
npm run admin:setup
```

O comando pede o e-mail, gera uma senha forte e mostra essa senha **uma vez no terminal**. Guarda somente o hash e o segredo de IP no `.env`. Salve a senha num gerenciador e copie `NUXT_ADMIN_EMAIL`, `NUXT_ADMIN_PASSWORD_HASH` e `NUXT_IP_HASH_SECRET` para a Railway. Você não precisa enviar a senha para ninguém.

Executar o comando de novo gera outra senha e outro segredo. Para trocar a senha de um serviço já publicado, atualize o hash na Railway e encerre as sessões anteriores com `DELETE FROM reb_sessions;` no banco correto. A troca do hash sozinha não cancela sessões já abertas.

### Configurar o Turnstile

1. No painel da Cloudflare, abra **Turnstile** e crie um widget do tipo **Managed**.
2. Autorize `sorteio.redeepiscopalbrasileira.com.br`. Inclua também o domínio Railway usado em testes, se houver.
3. Copie a **Site key** para `NUXT_PUBLIC_TURNSTILE_SITE_KEY` e a **Secret key** para `NUXT_TURNSTILE_SECRET_KEY`.
4. Atualize `NUXT_PUBLIC_SITE_URL` para o endereço em que está testando. A validação compara o hostname e a ação `register` no servidor.
5. Faça um cadastro completo pelo celular no endereço publicado.

Produção exige o Turnstile. Apenas o servidor de desenvolvimento permite testar sem as chaves. Não use as chaves de teste da Cloudflare na live. Você pode usar o Turnstile mesmo sem colocar o DNS sob proxy da Cloudflare.

## Railway, Docker e infraestrutura como código

O arquivo **`.railway/railway.ts`** usa o formato atual de Infrastructure as Code da Railway. Não há `railway.toml` ou `railway.json` neste projeto.

Ele descreve:

- Um PostgreSQL chamado `Postgres`, com persistência gerenciada pela Railway.
- Um serviço chamado `Sorteio REB`, construído pelo Dockerfile, a partir de `dodopok/sorteio-reb-2027`, branch `main`.
- Conexão ao banco pela referência privada, migração antes do deploy e healthcheck em `/api/health`.
- Variáveis operacionais e preservação de segredos já existentes na plataforma. Se fornecidos no ambiente local ao avaliar o plano, os segredos são enviados como variáveis seladas, sem gravá-los no código.

O domínio personalizado é configurado **no painel da Railway** nesta versão do arquivo. Informe `sorteio.redeepiscopalbrasileira.com.br`, porta `3000`, e crie no seu provedor de DNS exatamente os registros indicados pela Railway. Aguarde a validação e a emissão do certificado antes de divulgar o link.

O tráfego entre aplicação e banco na rede privada evita egress público dessa conexão. A entrega de páginas e imagens às pessoas continua sendo tráfego de saída; não é uma hospedagem inteira sem egress. Não exponha o banco publicamente para a aplicação conectar.

### Se já criou os serviços pelo painel

Confira o nome dos serviços antes de aplicar a IaC. O arquivo espera `Postgres` e `Sorteio REB`. Se os nomes forem diferentes, ajuste o arquivo para os nomes reais antes do plano; não crie um segundo banco por engano. Não misture este arquivo com configuração legada por serviço.

Com Railway CLI compatível com IaC, autenticado na sua conta:

```bash
railway link
railway config plan
```

No `link`, escolha o projeto e ambiente corretos. Revise o plano: criação de recursos, alterações, referências de banco e eventuais remoções. **Não aplique um plano que proponha apagar ou substituir o banco com inscrições.** Quando estiver de acordo:

```bash
railway config apply
```

Não use `--show-values` para compartilhar planos ou logs: isso pode expor segredos. Não use confirmação automática de mudanças destrutivas. Para importar a configuração de um projeto existente, a Railway também oferece `railway config pull`; revise o resultado antes de substituir o arquivo deste repositório.

Se ainda não houver projeto, crie um dedicado a este evento, vincule a pasta com `railway link` e revise o plano antes de aplicar. Na primeira criação, preencha os segredos no serviço assim que ele existir. O healthcheck permanece indisponível enquanto faltarem chaves ou acesso ao banco; um novo deploy após configurar as variáveis conclui a publicação.

### O que o Dockerfile faz

Compila o Nuxt em uma etapa de build usando Node 24. A imagem final contém o servidor compilado, arquivos públicos, migração e driver PostgreSQL. Executa como usuário sem privilégios e escuta na porta `3000`. O arquivo `.env` e os testes ficam fora da imagem.

Para conferir a imagem localmente:

```bash
docker build -t sorteio-reb .
docker run --rm --env-file .env -p 3000:3000 sorteio-reb
```

O segundo comando exige banco acessível ao container e variáveis de produção completas. Um banco no Mac em `127.0.0.1` não estará nesse endereço dentro do Docker; use `host.docker.internal` no ambiente local. O servidor compilado exige Turnstile mesmo quando executado no seu computador.

## Preparação para a live

Faça a preparação hoje e use o ensaio para verificar a apresentação sem gastar as quatro rodadas reais:

1. Entre em `/admin/login` com seu e-mail e a senha que gerou.
2. Abra `/ensaio`, faça as quatro rodadas, teste tela cheia e veja se o nome aparece bem na captura. Os nomes dessa página são fictícios e não acessam o banco.
3. Use navegador com zoom de 100% e teste a captura na resolução da live. Há uma versão responsiva para acompanhar pelo celular.
4. Confira a roleta de primeiros nomes e a revelação do nome completo do ganhador. WhatsApp e e-mail não aparecem nessa tela. **Compartilhe somente `/admin/palco`**, não o painel nem o navegador inteiro.
5. Teste o QR Code com outro celular. Os arquivos `public/live/qr-sorteio.svg` e `public/live/qr-sorteio.png` apontam para o domínio público definitivo.
6. Confira o regulamento, a política de privacidade e o responsável pelo contato dos ganhadores.
7. Confira backup do PostgreSQL e acesso à conta Railway. Evite atualizar código ou infraestrutura durante o sorteio.

### Apagar os testes antes do sorteio oficial

Se fez cadastros ou sorteios reais para testar a aplicação:

1. Entre no painel `/admin` e vá até **Apagar os testes**, no final da página.
2. Clique em **Apagar testes e zerar**. Confira a quantidade de inscrições e resultados indicada.
3. Digite **APAGAR TESTES** e clique em **Apagar e zerar**.
4. Confira **0 inscrições**, **0 livros sorteados** e **Ainda não abertas**. Feche as abas antigas do palco.
5. Quando estiver pronto para a live, clique em **Abrir inscrições** e divulgue o link.

Isso apaga todas as inscrições e resultados da base atual, inclusive contatos e registros dos sorteios. Não há como desfazer pelo painel. Use somente antes do sorteio oficial. Backups da hospedagem e CSVs já baixados não são apagados por essa ação.

O acesso do admin e as proteções de limite de tentativas continuam ativos. O reset ocorre em uma transação; se entrar uma inscrição ou um resultado depois da confirmação ter sido aberta, a exclusão é recusada e o painel deve ser atualizado. Páginas antigas não conseguem cadastrar, abrir inscrições ou sortear na nova rodada até atualizar. A confirmação de cadastro de teste guardada no navegador também perde a validade, permitindo se inscrever novamente.

## Operação durante a live

1. No painel, clique em **Abrir inscrições**.
2. Divulgue o QR Code e o link na transmissão.
3. Acompanhe o número de inscrições. O painel atualiza a cada 15 segundos; **Atualizar agora** força a leitura.
4. Quando decidir encerrar, clique em **Encerrar inscrições** e confirme. O servidor bloqueia novos cadastros imediatamente; os formulários já abertos atualizam o status em até 30 segundos e recebem uma mensagem de encerramento se tentarem enviar antes disso.
5. Clique em **Abrir tela do sorteio**. Compartilhe essa aba na live e use **Tela cheia**.
6. Clique em **Sortear agora**. A roleta passa por primeiros nomes, desacelera e revela o ganhador em aproximadamente sete segundos. A animação é apenas visual; o resultado já está salvo. Com a preferência de movimento reduzido do dispositivo, o resultado aparece diretamente.
7. Clique em **Próximo prêmio** para preparar a rodada seguinte. Repita até concluir as quatro rodadas.
8. Encerre o compartilhamento de tela. Volte ao painel e clique em **Mostrar contatos**.
9. Baixe o CSV dos **quatro ganhadores**. Ele identifica o prêmio e o responsável pelo envio. Encaminhe à Thomas Nelson somente os contatos dos três ganhadores dos livros; a REB cuida do ganhador do kit. O endereço de entrega deve ser solicitado em contato privado.

Se a conexão cair durante uma rodada, recarregue a mesma aba. A página recupera a operação e apresenta o resultado salvo; não escolhe outro nome. Se duas abas disputarem a mesma rodada, uma vence e a outra recebe a orientação de atualizar. Evite fazer os sorteios em vários aparelhos ao mesmo tempo.

## Segurança e limites reais

- E-mail normalizado e WhatsApp único são protegidos por restrições do próprio PostgreSQL, inclusive em inscrições simultâneas. Maiúsculas/minúsculas e espaços do e-mail são normalizados; pontos e aliases `+` do Gmail também não criam chances extras.
- Não há confirmação por SMS ou e-mail. Uma pessoa com dois e-mails e dois números diferentes ainda pode tentar se cadastrar duas vezes. O sistema reduz abuso com captcha e limites de tentativas; ele não comprova identidade. Os casos identificados devem ser tratados pela organização conforme o regulamento.
- Cadastro: até **15 tentativas por IP a cada 10 minutos**. Login: **5 a cada 15 minutos**. Limites administrativos específicos protegem sorteios, mudanças de estado e exportação. Os contadores ficam no banco e valem entre réplicas/reinícios; uma pequena cache local reduz as consultas de IPs já bloqueados.
- Pessoas numa mesma rede podem compartilhar o IP e atingir o limite. Considere isso se houver um grupo grande assistindo junto. Os números podem ser ajustados em `server/api/register.post.ts`, após avaliar o uso real.
- IPv6 é agrupado por `/64`. Na Railway, o IP vem de `X-Real-IP` do ingress; fora dela, vem da conexão. Não é usado um `X-Forwarded-For` enviado livremente pelo visitante.
- O servidor valida origem, conteúdo JSON, tamanho máximo de 8 KB e todos os campos. O Turnstile é validado no servidor, com hostname, ação e token de uso único.
- Senha com `scrypt`, cookie `HttpOnly`, `Secure` em produção e `SameSite=Strict`. Sessões expiram em 8 horas; só o hash do token é guardado no banco. **Entre novamente antes da live** se tiver feito login muito antes.
- Consultas parametrizadas, contatos fora da tela de apresentação, resposta igual para cadastro novo/duplicado e exportação CSV com proteção contra fórmulas.
- O sorteio usa aleatoriedade criptográfica do Node, amostragem sem viés, transação e trava no banco. Guarda horário, rodada, quantidade elegível e hash da lista de candidatos para registro do procedimento.

Essas proteções não substituem proteção de borda contra DDoS. Se colocar o domínio sob proxy Cloudflare, configure regras para abuso de APIs e login sem exigir desafios extras para todos os visitantes legítimos. Confira métricas e limites de custo na Railway.

Uma instância da aplicação e um PostgreSQL são suficientes como arquitetura inicial para 200–500 participantes. O banco usa um pool de até 10 conexões por instância. Foram verificadas **500 inscrições concorrentes diretamente em PostgreSQL local**; isso confirma a integridade do banco e não é uma promessa de capacidade da hospedagem nem um teste de 500 navegadores com Turnstile. Para medir produção, use um ambiente separado e observe CPU, memória, conexões, latência e custos.

## Privacidade, regras e fim do evento

O aplicativo inclui `/regulamento` e `/privacidade`, com consentimento registrado na versão `2026-10-03-v3`, finalidades limitadas ao sorteio, exibição do primeiro nome na animação, anúncio do nome completo do ganhador e compartilhamento dos dados necessários à entrega. A versão v3 acrescenta o kit e seu envio pela REB. Inscrições v2 continuam válidas e podem ter o primeiro nome na animação, pois já incluíam esse consentimento; inscrições v1 não entram nessa amostra visual. Não há consentimento para marketing nem lista de divulgação.

**Antes de publicar, a organização precisa confirmar:** identificação correta do responsável, contato público, eventual CNPJ, condições de envio e prazo de guarda. A política propõe **até 90 dias após a conferência**, até **1º de janeiro de 2027**, com exceções legais fundamentadas. A limpeza é uma tarefa operacional; o aplicativo não elimina automaticamente o banco ou seus backups.

A participação numa conferência teológica pode permitir inferências sobre interesses religiosos. O formulário não pergunta religião, mas pede consentimento específico para as finalidades descritas. Leia e revise os documentos com esse contexto.

**LGPD e enquadramento do sorteio são assuntos separados.** Uma distribuição gratuita de prêmios com apoio de uma marca pode estar sujeita às regras de promoção comercial e autorização prévia. O código e o regulamento não declaram autorização ou dispensa. Confirme o enquadramento com a organização e assessoria antes da divulgação; o prazo curto não cria uma dispensa.

Após a live:

1. Mantenha as inscrições encerradas e faça contato privado com os ganhadores.
2. Compartilhe com a editora apenas o necessário à entrega dos três livros. A REB faz o envio do kit sem encaminhar os dados desse ganhador à editora. Registre a conclusão das quatro entregas.
3. Atenda solicitações de acesso, correção, revogação ou exclusão pelo e-mail público. Antes do sorteio, uma exclusão retira a pessoa da lista; após um resultado, não apague registros sem avaliar a necessidade de preservá-los para entrega e direitos dos envolvidos.
4. Faça a limpeza das sessões e limites expirados com acesso administrativo ao banco correto:

```sql
DELETE FROM reb_sessions WHERE expires_at < now();
DELETE FROM reb_limits WHERE expires_at < now();
```

5. Programe a revisão de retenção e a eliminação/anonimização dos contatos, considerando também os backups e CSVs exportados. Faça isso no banco de produção correto, depois de resolver entregas e eventuais obrigações de guarda.
6. Não reutilize essa base para outro evento. Para outra conferência, configure um ambiente/banco novo, novas datas e uma nova versão dos documentos e do consentimento.

## Desenvolvimento local

Requisitos: **Node 24**, npm e PostgreSQL 14 ou superior. Chrome instalado é necessário para os testes de navegador configurados neste projeto.

```bash
npm ci
cp .env.example .env
npm run admin:setup
```

Edite `.env`, configure `NUXT_DATABASE_URL` com o banco **local de desenvolvimento** e defina `NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`. Em desenvolvimento, é possível deixar as chaves do Turnstile vazias.

```bash
npm run db:migrate
npm run dev
```

Abra http://127.0.0.1:3000. Entre no admin e abra as inscrições. Use `/ensaio` para testar só a animação. Para testes de cadastro e sorteio completos, use dados fictícios exclusivamente no ambiente local/de testes.

Se o binding nativo do Rolldown falhar no macOS, o projeto inclui a alternativa WASI. Nesse caso, tente:

```bash
NAPI_RS_FORCE_WASI=true NUXT_TELEMETRY_DISABLED=1 npm run dev
```

Use as mesmas variáveis para `typecheck`, `test` ou `build` nessa máquina, se necessário. O aviso de WASI experimental é esperado; o Docker Linux usa o binding nativo.

### Verificações

```bash
npm run typecheck
npm test
npm run build
```

Sem `REB_TEST_DATABASE_URL`, os testes de banco são pulados. Para verificar concorrência, duplicidade, idempotência e sorteios em PostgreSQL real, crie um banco **dedicado** cujo nome termine com `_test`:

```bash
REB_TEST_DATABASE_URL=postgres://USUARIO:SENHA@localhost/raffle_test npm test
```

Os testes de banco **apagam as tabelas de teste antes de cada caso**. Nunca passe a URL de produção. O sufixo `_test` é uma barreira adicional, não substitui conferir o endereço do banco.

Para testar o fluxo no navegador, deixe o servidor de desenvolvimento apontando para esse **mesmo banco de testes** e rodando em `127.0.0.1:3000`. Configure um hash de teste local compatível com a senha definida em `tests/e2e/flows.spec.ts`; esse valor é exclusivo dos testes e não deve ir para a Railway. Depois:

```bash
REB_TEST_DATABASE_URL=postgres://USUARIO:SENHA@localhost/raffle_test npm run test:e2e
```

Os testes verificam cadastro no celular, consentimentos, login, proteção das APIs, encerramento, apresentação, recuperação de resultado e ensaio. Também limpam e preenchem o banco de testes. Se a senha local de teste mudar, ajuste o teste correspondente.

## Problemas comuns

| Sintoma | O que conferir |
| --- | --- |
| Deploy falha no healthcheck | Variáveis secretas, as duas chaves Turnstile, URL do banco e execução da migração. Veja `/api/health` e os logs de pré-deploy/runtime na Railway. |
| `Configuration incomplete` | Falta URL de banco, hash da senha, segredo de IP com 32+ caracteres ou chaves Turnstile em produção. |
| `Database unavailable` | Referência de banco incorreta, serviços em ambientes diferentes, banco ainda iniciando ou migração não executada. |
| Formulário diz “Inscrições em breve” | Se `/api/status` retorna `available: true`, basta abrir pelo admin. `available: false` indica indisponibilidade do banco. |
| Cadastro dá “Recarregue a página” | `NUXT_PUBLIC_SITE_URL` não corresponde ao domínio acessado, ou a requisição veio de outra origem. |
| Turnstile não aparece ou não valida | Chaves do mesmo widget, domínio autorizado, URL pública correta e acesso do navegador à Cloudflare. |
| Erro 429 / muitas tentativas | Aguarde o `Retry-After`. Cadastros feitos numa mesma rede compartilham o limite. Não remova toda a proteção para contornar um teste. |
| Login falha | Confirme e-mail, hash completo, senha gerada e redeploy após alteração das variáveis. |
| Não consegue encerrar | Há menos de quatro inscrições. |
| Não consegue reabrir | Já houve um sorteio real; esse bloqueio é intencional. |
| Conexão caiu durante a animação | Recarregue a mesma aba para recuperar a operação gravada. |
| Tela de ganhador estava aberta em dois aparelhos | Atualize a tela com erro. A rodada concorrente não gera um segundo ganhador para o mesmo prêmio. |
| Domínio novo não abre | Confira os registros exatos solicitados pela Railway, validação do domínio e certificado HTTPS. |
| API não recebe requisições antes de o JavaScript carregar | Os campos ficam desabilitados até a página estar pronta. Em conexão lenta, aguarde; isso evita envio nativo acidental do formulário. |

## Onde editar

| Arquivo/pasta | Conteúdo |
| --- | --- |
| `app/pages/index.vue` | Página pública e formulário. |
| `app/assets/css/main.css` | Tipografia, cores, layout, responsividade e animações. |
| `shared/raffle.ts` | Prêmios, responsáveis pelo envio e versão do consentimento. |
| `app/components/KitMockup.vue`, `public/images/kit/` | Composição do kit, capa e arte originais, caneca e item surpresa gerados como imagens realistas. |
| `app/pages/admin/` | Login, painel e tela de apresentação. |
| `app/components/DrawStage.vue` | Animação e recuperação de resultados. |
| `app/components/NameReel.vue` | Roleta de primeiros nomes em 3D, com desaceleração. |
| `app/pages/ensaio.vue` | Ensaio com dados fictícios. |
| `app/pages/regulamento.vue`, `app/pages/privacidade.vue` | Regras e tratamento de dados. Atualize a versão quando mudar o consentimento. |
| `server/api/`, `server/utils/` | Validação, autenticação, rate limit, banco e APIs. |
| `database/001_schema.sql` | Tabelas, restrições e operações transacionais. |
| `.railway/railway.ts`, `Dockerfile` | Infraestrutura e imagem da aplicação. |
| `public/live/qr-sorteio.*` | QR Code com o domínio definitivo. |

Os arquivos e rotas de GC existentes são opcionais; a operação do sorteio não depende deles. Para esta live, use o material que você preparou à parte.

## Referências

- [Railway: Infrastructure as Code](https://docs.railway.com/infrastructure-as-code) e [referência da configuração](https://docs.railway.com/infrastructure-as-code/reference).
- [Railway: rede privada](https://docs.railway.com/networking/private-networking) e [domínios públicos](https://docs.railway.com/networking/public-networking).
- [Cloudflare Turnstile: validação no servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
- [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- [Ministério da Fazenda: distribuição gratuita de prêmios](https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial/promocoes-comerciais/o-que-e-distribuicao).
- Capas oficiais: [Toda a Escritura é…](https://thomasnelson.com.br/products/toda-a-escritura-e-michael-f-bird), [Religião estranha](https://thomasnelson.com.br/products/religiao-estranha-como-os-primeiros-cristaos-eram-esquisitos-perigosos-e-cativantes-nijay-gupta), [Jesus e os poderes](https://thomasnelson.com.br/products/jesus-e-os-poderes-o-reino-de-deus-em-um-mundo-de-democracias-em-ruinas-nt-wrightmichael-f-bird). Fontes locais acompanhadas de suas licenças em `public/fonts`.
