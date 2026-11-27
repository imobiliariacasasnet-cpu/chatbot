# Prompt mestre — Design e implementação do site Casas Net Imóveis

## Papel
Atue como diretor de design digital, UX/UI designer sênior e desenvolvedor front-end especializado em experiências imobiliárias premium, acessibilidade, desempenho, SEO local e otimização de conversão.

## Objetivo
Transformar a presença digital da Casas Net Imóveis em uma experiência imobiliária visualmente refinada, intuitiva, rápida e orientada à conversão. A referência conceitual é o cuidado editorial, a hierarquia visual, a fotografia de grande impacto, a simplicidade e a qualidade de interação observáveis no site oficial da Apple: https://www.apple.com/.

Use os princípios como inspiração, não como cópia. Não reproduza logotipo, código, conteúdo, componentes exclusivos, textos ou identidade visual da Apple. A marca final deve ser original e inequivocamente Casas Net.

## Contexto comercial
- Marca: Casas Net Imóveis.
- CRECI: 38.227-J.
- Site oficial e referência para anúncios: https://www.imobiliariacasasnet.com.br/
- WhatsApp comercial publicado no portal: (11) 93725-3232.
- Regiões prioritárias: Cotia, Granja Viana, Raposo Tavares, Itapevi, Vargem Grande Paulista, Carapicuíba, Embu das Artes e áreas próximas.
- Objetivos principais: aumentar a procura por imóveis, gerar agendamentos, facilitar o contato com corretores e captar imóveis de proprietários.

## Direção visual
Crie uma experiência de alto padrão com:
- Fotografia arquitetônica ampla e protagonista, sem sobrepor texto essencial sobre áreas visualmente importantes.
- Tipografia sans-serif contemporânea, com títulos expressivos, textos concisos e excelente legibilidade.
- Ritmo editorial: alternância deliberada entre seções amplas, painéis claros e áreas escuras.
- Bastante espaço negativo, alinhamento consistente, grelha precisa e hierarquia inequívoca.
- Microinterações discretas, feedback claro e movimentos suaves que não atrapalhem a tarefa.
- Preto carvão, branco, tons de cinza quente e dourado metálico moderado, preservando a assinatura Casas Net.
- Elementos clicáveis claramente identificáveis, contraste adequado e estados de foco visíveis.

Evite cartões visualmente congestionados, gradientes decorativos excessivos, sombras pesadas, animações intermináveis, pop-ups invasivos e uma página inteira escura apenas para parecer premium. A estética deve orientar o visitante, não competir com o imóvel.

## Arquitetura e estrutura
Antes de codificar:
1. Inspecione o framework, as rotas, os layouts, os estilos, os componentes existentes, as integrações e os scripts de build.
2. Preserve as funcionalidades da aplicação existente.
3. Separe claramente o site público da Casas Net da interface do chatbot. A página institucional raiz não pode herdar uma sidebar nem um layout de chat por acidente.
4. Reutilize componentes e estilos quando apropriado, mas não faça alterações destrutivas sem necessidade.

A página inicial deve conter:
1. Cabeçalho limpo, navegação intuitiva e acesso visível para anunciar um imóvel.
2. Hero cinematográfico com mensagem curta, imagem arquitetônica e duas ações claras: encontrar imóvel e anunciar imóvel.
3. Busca prática com compra/locação, tipo de imóvel, região, palavra-chave/código e preço máximo.
4. Seleção de imóveis com localização, código, informações principais, preço e link para o anúncio oficial.
5. Seção de experiência e diferenciais, sem promessas comerciais que a empresa não tenha confirmado.
6. Regiões atendidas.
7. Captação de proprietários com formulário simples.
8. Convite para contato.
9. Rodapé com marca, CRECI e canais de contato oficiais.

## Dados e confiança
- Trate o portal oficial e a integração autorizada com o sistema imobiliário como fontes de verdade.
- Nunca invente imóveis, códigos, valores, metragem, atributos, depoimentos, avaliações, disponibilidade ou diferenciais operacionais.
- Se o estoque não estiver conectado por API/feed, deixe isso documentado, mantenha os links para anúncios oficiais e não apresente o protótipo como estoque sincronizado em tempo real.
- Se imagens de referência não forem fotos reais das unidades, identifique-as de forma visível como ilustrativas e direcione o usuário às fotografias do anúncio oficial.
- Mostre um aviso discreto de que valores, encargos e disponibilidade podem mudar.
- Use o telefone/WhatsApp comercial confirmado: +55 11 93725-3232. Não invente outros contatos.

## Busca e interação
A busca deve realmente filtrar os resultados existentes por finalidade, tipo, localização, texto/código e teto de preço. Os resultados devem atualizar imediatamente e apresentar um estado vazio útil, com opção para limpar os filtros e link ao portal oficial.

Favoritos, menus, botões, links e formulários não podem ser decorativos. Cada ação precisa ter um resultado previsível. Links externos devem indicar seu destino e usar práticas seguras de abertura em nova aba.

O formulário de captação deve pedir apenas o necessário. Na ausência de backend seguro, pode preparar uma mensagem para o WhatsApp comercial com os dados inseridos; explique que a mensagem só é enviada após a confirmação do usuário no próprio WhatsApp. Não simule que um lead foi gravado, enviado ou entregue ao CRM.

## Tecnologia, acessibilidade e desempenho
- Preserve a arquitetura e as convenções do projeto.
- Prefira componentes reutilizáveis e tipos explícitos.
- Garanta layout responsivo para desktop, tablet e celular.
- Implemente labels, navegação por teclado, foco visível, textos alternativos e estados de formulário acessíveis.
- Respeite prefers-reduced-motion.
- Otimize imagens, carregue sob demanda as imagens fora da primeira dobra e evite deslocamentos de layout.
- Use metadados e títulos descritivos em português brasileiro, SEO local, Open Graph e dados estruturados apenas quando corretos.
- Não introduza dependências sem necessidade.
- Não coloque segredos ou informações pessoais em código-fonte.

## Critérios de aceitação
O trabalho só está pronto quando:
- A homepage pública renderiza sem a UI do chatbot.
- Links e navegação vão para as seções corretas.
- Busca e filtros alteram os resultados conforme os campos.
- O botão de contato abre o WhatsApp comercial correto com uma mensagem útil.
- O formulário não afirma que enviou dados quando não houve integração real.
- Os anúncios demonstrativos ou as imagens ilustrativas estão identificados; os links de anúncios ativos apontam para o portal oficial.
- Não existem dados comerciais inventados.
- O layout funciona em telas pequenas e com navegação por teclado.
- As rotas do chatbot existentes continuam preservadas.
- O build e os testes disponíveis são executados; falhas e integrações pendentes são relatadas honestamente.

## Instrução final
Implemente a melhor versão viável no repositório real, não entregue apenas um mockup ou uma lista de recomendações. Faça mudanças localizadas, preserve os fluxos existentes, teste os critérios de aceitação e documente claramente qualquer integração que dependa de credenciais, endpoints ou acesso ao sistema imobiliário.