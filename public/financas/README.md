# Meu Financeiro Pessoal

Aplicativo web responsivo e instalável como PWA, em português e com moeda BRL. Abre sem cadastro ou login e salva os dados no armazenamento local do navegador. Os dados não são sincronizados entre dispositivos; qualquer pessoa que use o mesmo navegador pode acessá-los.

## Recursos
- Dashboard com receitas, despesas, saldo, taxa de economia e gráficos.
- Lançamentos com edição, exclusão, contas/origens, observações, categorias e importação de extratos CSV/OFX.
- Compras parceladas distribuídas nos meses seguintes, com vínculo opcional ao cartão e cálculo de utilização mensal do limite.
- Orçamentos por categoria e mês, metas editáveis com contribuições, cartões editáveis e dívidas com parcelas, vencimentos e pagamentos parciais.
- Backup e restauração por arquivo JSON.
- Acesso direto sem cadastro ou login.
- Dados de uso atual armazenados localmente no navegador, com exportação e restauração por backup JSON.
- Importação opcional, uma única vez, dos dados criptografados de contas locais da versão anterior; a senha antiga é solicitada apenas para essa migração.
- Migração compatível com chaves de dados de versões anteriores do site, com deduplicação por data, tipo, descrição e valor.

## Como funciona o acesso sem login
1. Abra o aplicativo; o painel financeiro aparece diretamente, sem cadastro.
2. Os lançamentos, orçamentos, metas, cartões e dívidas ficam salvos no navegador e dispositivo usados.
3. Exporte backups JSON regularmente. Para abrir os mesmos dados em outro dispositivo, restaure um backup.
4. Se você tinha dados criptografados na versão anterior, vá a Configurações e use **Importar dados antigos**. Informe a conta antiga uma única vez; depois o acesso continuará sem login.

## Limites importantes
- Os dados são salvos no navegador atual, sem autenticação nem separação entre pessoas que compartilhem o mesmo dispositivo. Não use em um dispositivo compartilhado para informações privadas.
- Os dados locais podem ser perdidos se limpar os dados do site, perder o dispositivo ou apagar o perfil do navegador. Exporte backups regularmente.
- O acesso sem login não sincroniza automaticamente os dados entre dispositivos.
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


## Escanear nota fiscal com IA

O botão **Escanear Nota Fiscal** abre a câmera traseira em celulares compatíveis ou permite selecionar uma imagem. A imagem é reduzida no navegador e enviada para a rota de servidor `api/scan-receipt.js`, que chama a OpenAI Responses API e retorna os campos estruturados. O app preenche o formulário de despesa, mas **não salva nada até você revisar e clicar em Salvar gasto**.

### Configuração do leitor inteligente na Vercel

Este recurso precisa da hospedagem Vercel, pois o GitHub Pages publica somente arquivos estáticos e não executa a rota segura de API.

A função `api/scan-receipt.js` aceita autenticação por uma destas opções, em ordem de preferência: `OPENAI_API_KEY` para a API direta da OpenAI; `AI_GATEWAY_API_KEY` para o Vercel AI Gateway; ou o token OIDC enviado pela Vercel no cabeçalho `x-vercel-oidc-token` da invocação da Function. OIDC evita manter uma chave de API fixa no projeto, desde que o projeto esteja habilitado para usar o AI Gateway.

1. Importe este repositório na Vercel usando a raiz do repositório. O arquivo `vercel.json` já configura a função `api/scan-receipt.js`.
2. Preferencialmente, confirme que o OIDC do projeto e o AI Gateway estão habilitados. Se não estiverem, vá a **Project → Settings → Environment Variables** e configure `AI_GATEWAY_API_KEY` ou `OPENAI_API_KEY` como segredo do servidor. Nunca inclua uma chave no JavaScript do navegador ou no GitHub.
3. Configure `APP_ORIGIN` apenas se for necessário, usando a origem exata do site publicado, sem caminho nem barra final.
4. `OPENAI_RECEIPT_MODEL` é opcional. O padrão é `gpt-4o-mini`; ao usar o AI Gateway, ele é enviado como `openai/gpt-4o-mini`.
5. Faça novo deploy e teste **Escanear Nota Fiscal** na URL da Vercel. A função usa saída estruturada JSON Schema, valida os dados e limita tamanho, origem e frequência por instância.

A imagem da nota é enviada ao serviço de IA para análise e não é armazenada pelo nosso código de aplicação. A chamada usa `store: false` e a resposta usa `Cache-Control: no-store`. Sempre confira estabelecimento, valor, data e categoria antes de salvar. A proteção de frequência é básica por instância serverless; para uso público intenso, adicione rate limiting persistente ou proteção WAF.

O GitHub Pages serve o restante do aplicativo, mas **a leitura inteligente não funciona no domínio `github.io`**, porque ali não existe a função `/api/scan-receipt`. Use a versão hospedada na Vercel para essa funcionalidade.

## Importação CSV / OFX
O app não se conecta diretamente ao banco. Exporte um arquivo do internet banking e importe-o. O CSV deve conter colunas de data, descrição, valor e, opcionalmente, tipo e categoria. Os formatos variam por banco; revise a prévia antes de confirmar. Nunca envie senhas bancárias.
