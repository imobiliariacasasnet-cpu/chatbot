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

### Configuração obrigatória na Vercel

Este recurso precisa da hospedagem Vercel, pois o GitHub Pages publica somente os arquivos estáticos e não executa a rota segura de API.

1. Importe este repositório na Vercel usando a raiz do repositório. O arquivo `vercel.json` já mantém `public/financas` como diretório do site e configura a função `api/scan-receipt.js`.
2. No painel da Vercel, abra **Project → Settings → Environment Variables** e crie:
   - `OPENAI_API_KEY`: sua chave secreta da OpenAI. Ela fica apenas no servidor; nunca a coloque em `app.js`.
   - `APP_ORIGIN`: a origem exata do site publicado, por exemplo `https://seu-projeto.vercel.app`, sem caminho ou barra no final.
   - `OPENAI_RECEIPT_MODEL`: opcional; padrão `gpt-4o-mini`.
3. Faça um novo deploy depois de cadastrar as variáveis.
4. Abra o site pela URL da Vercel e teste **Escanear Nota Fiscal**. A rota usa Structured Outputs com JSON Schema, valida o conteúdo e limita tamanho, origem e frequência por instância.

A imagem da nota é enviada à OpenAI para análise; ela não é salva pelo nosso código de aplicação. O endpoint responde com `Cache-Control: no-store` e a chamada usa `store: false`. A leitura é uma sugestão: sempre confira estabelecimento, valor, data e categoria antes de salvar. A proteção de frequência incluída é básica por instância serverless; para um aplicativo público com uso intenso, adicione rate limiting persistente ou proteção WAF para evitar consumo abusivo da API.

O endereço GitHub Pages continuará servindo o restante do aplicativo, mas **a leitura inteligente não funciona no domínio `github.io`**, porque ali não existe a função `/api/scan-receipt`. Use a URL da Vercel para essa funcionalidade.

## Importação CSV / OFX
O app não se conecta diretamente ao banco. Exporte um arquivo do internet banking e importe-o. O CSV deve conter colunas de data, descrição, valor e, opcionalmente, tipo e categoria. Os formatos variam por banco; revise a prévia antes de confirmar. Nunca envie senhas bancárias.


## Autenticação do leitor inteligente via Vercel AI Gateway

A função `api/scan-receipt.js` agora aceita três rotas de autenticação, sem expor credenciais ao navegador: `OPENAI_API_KEY` para a API direta da OpenAI; `AI_GATEWAY_API_KEY` para o Vercel AI Gateway; ou o token OIDC que a Vercel envia no cabeçalho `x-vercel-oidc-token` da invocação da Function. A preferência é pela chave direta da OpenAI, depois pela chave do AI Gateway, e por último OIDC.

A opção OIDC evita manter uma chave de API fixa no projeto, mas depende de o projeto Vercel estar habilitado para usar o AI Gateway. Se a função continuar acusando ausência de credenciais, configure `AI_GATEWAY_API_KEY` nas variáveis de ambiente da Vercel ou configure `OPENAI_API_KEY` no servidor. Nunca publique uma chave no GitHub nem a inclua no JavaScript do navegador.

Ao usar o AI Gateway, o nome padrão `gpt-4o-mini` é enviado como `openai/gpt-4o-mini`; o endpoint continua usando saída estruturada JSON Schema e análise de imagens.