# Meu Financeiro Pessoal

Aplicativo web responsivo e instalável como PWA, em português e com moeda BRL.

## Recursos
- Dashboard com receitas, despesas, saldo, taxa de economia e gráficos.
- Lançamentos, filtros, categorias e importação de extratos CSV/OFX.
- Orçamentos, metas financeiras, cartões e dívidas.
- Backup e restauração por arquivo JSON.
- Login obrigatório por e-mail e senha, criação de conta e recuperação de senha.
- Dados carregados e salvos por conta, com Row Level Security (RLS) no Supabase.

## Configuração única do administrador (obrigatória antes de liberar usuários)
1. Crie um projeto em https://supabase.com/.
2. No painel do projeto, abra **SQL Editor** e execute todo o conteúdo de `supabase.sql`.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **Publishable** (que começa com `sb_publishable_`) ou a chave pública `anon` legada.
4. Abra `config.js` neste repositório e preencha:
   - `url`: Project URL.
   - `anonKey`: chave pública Publishable/anon.
5. Nunca coloque `service_role`, secret key ou senha do banco em `config.js`. A chave pública pode ficar no frontend porque o acesso aos dados é protegido pelas políticas RLS.
6. Em **Authentication → URL Configuration**, defina como Site URL:
   `https://imobiliariacasasnet-cpu.github.io/chatbot/`
   e adicione esse mesmo endereço em Redirect URLs.
7. Em **Authentication → Sign In / Providers**, mantenha Email habilitado e confirme os e-mails dos usuários.
8. Salve `config.js` no GitHub. A publicação automática será executada; depois acesse o app e crie a conta de administrador.

## Como funciona a separação de dados
- O aplicativo não mostra o painel sem uma sessão autenticada.
- Cada conta possui uma linha própria em `finance_data`, identificada pelo ID do usuário autenticado.
- O banco exige `auth.uid() = user_id` para leitura, inserção e alteração. Não há política para usuários anônimos.
- O app grava cópias locais apenas com uma chave derivada do ID daquela conta e sempre busca o estado principal da nuvem após o login.
- Ao sair, o estado em memória é limpo. Nenhum dado local antigo é atribuído automaticamente à primeira conta, para evitar transferir dados de outra pessoa num dispositivo compartilhado.
- O payload completo é sincronizado como um documento JSON por usuário. Não há edição simultânea/merge em tempo real; evite editar a mesma conta em vários dispositivos ao mesmo tempo.

## E-mail de confirmação e limites
Em projetos hospedados, a confirmação de e-mail costuma vir ativada. O serviço de e-mail padrão do Supabase é apenas para testes: atualmente envia somente para membros da organização e tem limite de 2 e-mails por hora. Para permitir cadastro/recuperação de senha de usuários externos em produção, configure um provedor SMTP próprio no Supabase. Consulte a documentação atual de [SMTP personalizado](https://supabase.com/docs/guides/auth/auth-smtp) e [limites do Auth](https://supabase.com/docs/guides/auth/rate-limits).

## Testar localmente
Sirva a pasta por HTTP (não abra por `file://`, pois o PWA/service worker exige HTTP/HTTPS):
```bash
cd public/financas
python -m http.server 8000
```
Abra `http://localhost:8000`.

## Publicação
O fluxo `.github/workflows/deploy-financas.yml` publica os arquivos estáticos via GitHub Pages na raiz do site:
`https://imobiliariacasasnet-cpu.github.io/chatbot/`.

## Importação CSV / OFX
O app não se conecta diretamente ao banco. Exporte um arquivo do internet banking e importe-o. O CSV deve conter colunas de data, descrição, valor e, opcionalmente, tipo e categoria. Os formatos variam por banco; revise a prévia antes de confirmar. Nunca envie senhas bancárias.

## Segurança e limites
- Não armazene senhas bancárias, números completos de cartão, CVV ou outros segredos.
- Cartões são registros informativos: o app não calcula ciclo de fatura completo, parcelamentos, juros ou pagamentos automáticos.
- Não há integração automática Open Finance; a importação é por arquivo.
- Exporte backups regularmente e teste com dados fictícios antes de usar dados financeiros importantes.
