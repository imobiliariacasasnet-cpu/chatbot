# Meu Financeiro Pessoal

Aplicativo web responsivo, instalável como PWA, com interface em português e moeda BRL.

## O que está implementado
- Dashboard com receitas, despesas, saldo, taxa de economia e gráficos por dia/categoria.
- Lançamentos de receitas/despesas, pesquisa, filtro, exclusão e categorias.
- Orçamentos por categoria, metas de poupança, cartões (cadastro de limite/dias) e registro de dívidas/pagamentos.
- Importação local de arquivos CSV e OFX, pré-visualização antes de importar e verificação aproximada de duplicidades.
- Exportação/restauração de backup JSON.
- Armazenamento local no navegador, funcionamento básico offline e tela para configurar Supabase Auth + sincronização.

## Testar
A pasta está em \`public/financas\` do repositório. Para teste local, sirva esta pasta via HTTP (não abra o arquivo como \`file://\` porque PWA/service worker exigem HTTP/HTTPS):
\`\`\`bash
cd public/financas
python -m http.server 8000
\`\`\`
Abra \`http://localhost:8000\`.

## Publicar
Quando o projeto hospedeiro for implantado, acesse o caminho \`/financas/\` do mesmo domínio. Como os arquivos vivem em \`public/financas\` num projeto Next.js existente, serão servidos como arquivos estáticos em \`/financas/\` após o build e implantação habituais do projeto hospedeiro. O commit dos arquivos não significa que o site já esteja publicado nem altera por si só o domínio de hospedagem.

## Sincronização na nuvem (opcional)
1. Crie um projeto no [Supabase](https://supabase.com/).
2. No SQL Editor do projeto, execute o arquivo \`supabase.sql\`.
3. Em Project Settings / API, copie Project URL e a chave pública (anon/publishable). Nunca use \`service_role\` no navegador.
4. Abra Configurações no app, informe URL/chave pública e salve.
5. Crie uma conta com e-mail e senha. Se a confirmação por e-mail estiver habilitada, confirme o e-mail antes de entrar.
6. Quando perguntado pela primeira vez, escolha se deseja enviar o estado local para essa conta. Se houver dados na nuvem, o app carrega o estado da nuvem para o navegador atual.

A tabela usa Row Level Security (RLS) e limita cada linha à conta autenticada. O conteúdo financeiro é guardado num payload JSON por utilizador; este MVP sincroniza o payload inteiro e não possui mecanismo de edição simultânea/merge entre dispositivos. Evite editar a mesma conta em vários dispositivos ao mesmo tempo.

## Importação CSV / OFX
O app não se conecta diretamente ao banco. Exporte um arquivo do internet banking e importe-o aqui. CSV deve conter colunas de data, descrição, valor, e opcionalmente tipo e categoria. Prefira o modelo fornecido. Os formatos de exportação variam por banco e podem precisar de ajustes. Revise tudo antes de confirmar. Arquivos são lidos no navegador; não envie senhas bancárias ou dados desnecessários.

## Limites e segurança
- Dados locais ficam no armazenamento do navegador; apagar dados do site ou perder o dispositivo pode apagá-los. Exporte backups regularmente.
- A nuvem depende de uma conta/projeto Supabase e de seus limites de plano.
- Não armazene senhas bancárias, números completos de cartão, CVV ou outros segredos.
- Cartões são registros informativos: o app não calcula ciclo de fatura completo, parcelamentos, juros ou pagamentos automáticos.
- Não há integração automática Open Finance; a importação é por arquivo.
- Antes de uso financeiro sensível, teste com dados fictícios, valide os extratos de cada banco e mantenha backups.
