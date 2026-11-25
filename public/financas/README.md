# Meu Financeiro Pessoal

Aplicativo web responsivo e instalável como PWA, em português e com moeda BRL. Esta versão funciona **somente no dispositivo/navegador em que a conta local foi criada**. Não usa servidor de autenticação, banco na nuvem nem sincronização.

## Recursos
- Dashboard com receitas, despesas, saldo, taxa de economia e gráficos.
- Lançamentos com edição, exclusão, contas/origens, observações, categorias e importação de extratos CSV/OFX.
- Compras parceladas distribuídas nos meses seguintes, com vínculo opcional ao cartão e cálculo de utilização mensal do limite.
- Orçamentos por categoria e mês, metas editáveis com contribuições, cartões editáveis e dívidas com parcelas, vencimentos e pagamentos parciais.
- Backup e restauração por arquivo JSON.
- Cadastro e login locais por e-mail e senha.
- Contas locais separadas neste navegador; os dados de cada conta são criptografados com AES-GCM.
- Chave derivada da senha com PBKDF2/SHA-256; a senha não é armazenada pelo aplicativo.

## Como funciona o login local
1. Abra o aplicativo no navegador/dispositivo em que deseja guardar os dados.
2. Escolha **Criar conta neste dispositivo**, informe um e-mail e uma senha com no mínimo 8 caracteres.
3. Entre com o mesmo e-mail e senha sempre que voltar a usar o aplicativo.
4. Ao sair, o conteúdo em memória é limpo. Para acessar novamente, será necessário entrar com a senha.
5. Se houver lançamentos antigos no armazenamento local deste navegador, o primeiro cadastro perguntará se deseja importá-los para a primeira conta local.

As contas são apenas locais. O mesmo e-mail em outro telefone, computador, navegador ou perfil não representa a mesma conta e não terá acesso aos mesmos dados. A lista de contas e os dados criptografados ficam no armazenamento local deste navegador.

## Limites importantes
- Não há sincronização, recuperação por e-mail ou redefinição de senha. Se esquecer a senha, os dados criptografados não poderão ser desbloqueados; será necessário usar um backup exportado anteriormente.
- Se apagar os dados do site/navegador, trocar de navegador/perfil, usar modo anônimo ou perder o dispositivo, os dados locais podem ser perdidos.
- Exporte backups regularmente em **Configurações → Seus dados → Exportar**. O arquivo de backup JSON não é criptografado; guarde-o em local seguro.
- A criptografia local protege os dados armazenados contra leitura casual sem a senha, mas não protege contra malware, extensões maliciosas, acesso ao navegador enquanto a conta está desbloqueada ou comprometimento do próprio dispositivo.
- Não armazene senhas bancárias, números completos de cartão, CVV ou outros segredos.
- Cartões não calculam ciclos completos de fatura, juros ou pagamentos automáticos; compras parceladas registram parcelas mensais estimadas a partir do valor total e não replicam regras específicas de emissores.
- Não há integração automática Open Finance; a importação é por arquivo.

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
