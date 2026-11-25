# Meu Financeiro Pessoal

Aplicativo web responsivo e instalável como PWA, em português e com moeda BRL. Por padrão, a conta local e os dados ficam criptografados neste navegador. A sincronização em nuvem é opcional e pode ser habilitada com um projeto Supabase próprio.

## Recursos
- Dashboard com receitas, despesas, saldo, taxa de economia e gráficos.
- Lançamentos com edição, exclusão, contas/origens, observações, categorias e importação de extratos CSV/OFX.
- Compras parceladas distribuídas nos meses seguintes, com vínculo opcional ao cartão e cálculo de utilização mensal do limite.
- Orçamentos por categoria e mês, metas editáveis com contribuições, cartões editáveis e dívidas com parcelas, vencimentos e pagamentos parciais.
- Backup e restauração por arquivo JSON.
- Cadastro e login locais por e-mail e senha.
- Contas locais separadas neste navegador; os dados de cada conta são criptografados com AES-GCM.
- Chave derivada da senha local com PBKDF2/SHA-256; a senha não é armazenada pelo aplicativo.
- Sincronização opcional com Supabase: apenas o registro criptografado é enviado à nuvem; a senha de criptografia local não é enviada.
- Migração compatível com chaves de dados de versões anteriores do site, com deduplicação por data, tipo, descrição e valor.

## Como funciona o login local
1. Abra o aplicativo no navegador/dispositivo em que deseja guardar os dados.
2. Escolha **Criar conta neste dispositivo**, informe um e-mail e uma senha com no mínimo 8 caracteres.
3. Entre com o mesmo e-mail e senha sempre que voltar a usar o aplicativo.
4. Ao sair, o conteúdo em memória é limpo. Para acessar novamente, será necessário entrar com a senha.
5. Se houver lançamentos antigos no armazenamento local deste navegador, o primeiro cadastro perguntará se deseja importá-los para a primeira conta local.

As contas são apenas locais. O mesmo e-mail em outro telefone, computador, navegador ou perfil não representa a mesma conta e não terá acesso aos mesmos dados. A lista de contas e os dados criptografados ficam no armazenamento local deste navegador.

## Sincronização opcional na nuvem
1. Crie um projeto gratuito no [Supabase](https://supabase.com/).
2. Abra o SQL Editor do projeto e execute \`supabase.sql\` (na pasta \`public/financas\` do repositório). Ele cria a tabela \`finance_data\` com Row Level Security (RLS) para que cada usuário autenticado só acesse a própria linha.
3. Em Project Settings / API, copie a Project URL e a chave pública \`anon\`/publishable. Nunca use a chave \`service_role\` no navegador.
4. Abra o app, entre na conta local e vá a Configurações. Informe URL e chave pública e salve.
5. Use Entrar na nuvem ou Criar conta na nuvem com seu e-mail. O e-mail da conta Supabase deve ser igual ao e-mail da conta local para sincronização.
6. Clique em Sincronizar para criar/atualizar a cópia remota. O Supabase recebe somente o registro criptografado da conta local.
7. Em outro dispositivo, crie primeiro uma conta local para abrir o app (ela pode começar vazia), configure o mesmo projeto e entre na conta Supabase. Informe a senha local original que criptografou o backup remoto no campo de desbloqueio e clique em Restaurar. A cópia remota substituirá a conta local desse dispositivo após confirmação.

O login local e o login Supabase são camadas diferentes: a senha Supabase autentica a conta da nuvem; a senha local deriva a chave que protege os dados. Elas podem ser diferentes. Guarde a senha local com segurança: sem ela, o backup criptografado não pode ser desbloqueado. Quando estiver conectado à nuvem, as alterações locais são sincronizadas após o salvamento, desde que os e-mails correspondam. Para evitar conflitos, não edite a mesma conta simultaneamente em dois dispositivos.

## Limites importantes
- Sem configurar o Supabase, o app funciona localmente e não sincroniza dados entre dispositivos.
- Os dados locais ficam criptografados no armazenamento do navegador; limpar os dados do site, perder o dispositivo ou apagar o perfil do navegador pode remover a conta local. Exporte backups regularmente.
- O backup JSON exportado é legível e não fica criptografado. Guarde-o em local seguro.
- A nuvem depende dos limites do plano Supabase utilizado. A configuração e a disponibilidade do serviço são responsabilidade da conta Supabase do usuário.
- Não armazene senhas bancárias, números completos de cartão, CVV ou outros segredos.
- Cartões são registros informativos: o app não calcula ciclos completos de fatura, juros ou pagamentos automáticos. Compras parceladas geram parcelas mensais estimadas e não replicam regras específicas dos emissores.
- A importação bancária é por arquivo CSV/OFX; não há conexão automática Open Finance.

## Testar localmente
Sirva a pasta por HTTP (não abra por `file://`, pois o PWA/service worker e Web Crypto exigem um contexto seguro):
```bash
cd public/financas
python -m http.server 8000
```
Abra `http://localhost:8000`.

## Publicação
O fluxo `.github/workflows/deploy-financas.yml` publica os arquivos estáticos via GitHub Pages:
`https://imobiliariacasasnet-cpu.github.io/chatbot/`.

## Importação CSV / OFX
O app não se conecta diretamente ao banco. Exporte um arquivo do internet banking e importe-o. O CSV deve conter colunas de data, descrição, valor e, opcionalmente, tipo e categoria. Os formatos variam por banco; revise a prévia antes de confirmar. Nunca envie senhas bancárias.
