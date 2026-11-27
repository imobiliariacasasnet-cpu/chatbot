"use client";

import { useMemo, useState } from "react";
import "./casas-net.css";

const homes = [
  { id: "demo-1", title: "Casa contemporânea com integração total", type: "Casa", location: "Granja Viana · Cotia", details: "3 suítes · 248 m² · 4 vagas", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85", tag: "DEMONSTRAÇÃO" },
  { id: "demo-2", title: "Arquitetura autoral em condomínio", type: "Casa", location: "Vargem Grande Paulista", details: "4 dormitórios · 310 m² · 3 vagas", image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85", tag: "DEMONSTRAÇÃO" },
  { id: "demo-3", title: "Apartamento com design contemporâneo", type: "Apartamento", location: "Butantã · São Paulo", details: "2 dormitórios · 86 m² · 2 vagas", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85", tag: "DEMONSTRAÇÃO" },
];
const areas = ["Cotia", "Granja Viana", "Raposo Tavares", "Itapevi", "Vargem Grande Paulista", "Carapicuíba", "Embu das Artes"];

export default function Page() {
  const [purpose, setPurpose] = useState("Comprar");
  const [kind, setKind] = useState("Todos os tipos");
  const [region, setRegion] = useState("");
  const [activeTab, setActiveTab] = useState("Todos");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const visibleHomes = useMemo(() => homes.filter((home) => {
    const matchKind = kind === "Todos os tipos" || home.type === kind;
    const matchTab = activeTab === "Todos" || home.type === activeTab;
    const matchRegion = !region || home.location.toLowerCase().includes(region.toLowerCase()) || (region.toLowerCase() === "cotia" && home.location.toLowerCase().includes("granja viana"));
    return matchKind && matchTab && matchRegion && `${home.title} ${home.location} ${home.details}`.toLowerCase().includes(query.toLowerCase());
  }), [kind, activeTab, region, query]);

  function goToSearch() { document.getElementById("imoveis")?.scrollIntoView({ behavior: "smooth" }); }

  return (
    <main className="cn-site">
      <div className="cn-topline"><span>CASAS NET IMÓVEIS</span><span>Seu próximo capítulo começa aqui.</span><span>CRECI 38.227-J</span></div>
      <header className="cn-header">
        <a className="cn-wordmark" href="#inicio" aria-label="Casas Net início"><span className="cn-logo-mark">⌂</span><span><b>CASASNET</b><small>IMÓVEIS · CRECI 38.227-J</small></span></a>
        <nav className="cn-nav" aria-label="Navegação principal"><a href="#imoveis">Encontrar imóvel</a><a href="#exclusividades">Exclusividades</a><a href="#regioes">Regiões</a><a href="#sobre">A Casas Net</a></nav>
        <button className="cn-header-cta" onClick={() => setOwnerOpen(true)}>Anuncie seu imóvel <span>↗</span></button>
      </header>
      <section id="inicio" className="cn-hero">
        <div className="cn-hero-image" aria-hidden="true" /><div className="cn-hero-gradient" />
        <div className="cn-hero-content"><p className="cn-eyebrow"><span /> IMÓVEIS SELECIONADOS. NOVAS POSSIBILIDADES.</p><h1>Seu próximo<br />capítulo <em>começa</em><br />aqui.</h1><p className="cn-hero-copy">Mais do que encontrar um imóvel, descubra um lugar que combina com a vida que você quer viver.</p><div className="cn-hero-actions"><button className="cn-button cn-button-gold" onClick={goToSearch}>Encontrar meu imóvel <span>↗</span></button><button className="cn-button cn-button-glass" onClick={() => setOwnerOpen(true)}>Quero anunciar <span>↗</span></button></div><div className="cn-hero-note"><span className="cn-note-line" /> Curadoria imobiliária na região oeste de São Paulo</div></div>
        <div className="cn-hero-index"><b>01</b><span>/</span> 03</div><a href="#imoveis" className="cn-scroll">EXPLORE <span>↓</span></a>
      </section>
      <section id="imoveis" className="cn-search-wrap">
        <div className="cn-search-intro"><span className="cn-eyebrow cn-eyebrow-dark">ENCONTRE SEU LUGAR</span><h2>Seu espaço.<br /><em>Seu jeito.</em></h2></div>
        <div className="cn-search-panel"><div className="cn-purpose-switch">{["Comprar", "Alugar"].map((p) => <button key={p} className={purpose === p ? "active" : ""} onClick={() => setPurpose(p)}>{p}</button>)}</div>
          <div className="cn-fields"><label><span>TIPO DE IMÓVEL</span><select value={kind} onChange={(e) => setKind(e.target.value)}><option>Todos os tipos</option><option>Casa</option><option>Apartamento</option></select></label>
            <label><span>REGIÃO OU CONDOMÍNIO</span><input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ex.: Granja Viana" list="cn-areas" /><datalist id="cn-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist></label>
            <label><span>PESQUISA LIVRE</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Quartos, condomínio..." /></label>
            <button className="cn-search-button" onClick={goToSearch}><span>⌕</span> Buscar imóveis <small>({purpose.toLowerCase()})</small></button></div>
          <p className="cn-search-hint">Esta versão visual usa imóveis demonstrativos. A disponibilidade real depende da integração com a base da imobiliária.</p></div>
      </section>
      <section id="exclusividades" className="cn-exclusive section-pad">
        <div className="cn-section-heading"><div><span className="cn-eyebrow"><span /> UMA SELEÇÃO ESPECIAL</span><h2>Descubra nossas<br /><em>exclusividades.</em></h2></div><p>Imóveis que merecem um olhar mais atento. Encontre espaços com personalidade e descubra novas possibilidades para viver.</p></div>
        <div className="cn-tabs" role="tablist" aria-label="Filtrar imóveis">{["Todos", "Casa", "Apartamento"].map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab === "Todos" ? "Todos os imóveis" : tab + "s"}</button>)}<span className="cn-demo-label">GALERIA CONCEITUAL</span></div>
        <div className="cn-property-grid">{visibleHomes.map((home) => <article className="cn-property-card" key={home.id}><div className="cn-property-image-wrap"><img src={home.image} alt={`Imagem ilustrativa de ${home.type.toLowerCase()}`} className="cn-property-image" loading="lazy" /><span className="cn-property-tag">{home.tag}</span><button aria-label={saved.includes(home.id) ? "Remover dos favoritos" : "Salvar nos favoritos"} className={`cn-heart ${saved.includes(home.id) ? "saved" : ""}`} onClick={() => setSaved((prev) => prev.includes(home.id) ? prev.filter((id) => id !== home.id) : [...prev, home.id])}>{saved.includes(home.id) ? "♥" : "♡"}</button><span className="cn-photo-count">FOTOGRAFIA CONCEITUAL</span></div><div className="cn-property-info"><span className="cn-property-location">{home.location}</span><h3>{home.title}</h3><p>{home.details}</p><div className="cn-property-bottom"><span className="cn-price-demo">Consulte a equipe</span><button onClick={() => setOwnerOpen(true)} aria-label="Solicitar informações">↗</button></div></div></article>)}{visibleHomes.length === 0 && <div className="cn-no-results">Nenhum exemplo corresponde aos filtros. Ajuste a busca para explorar outras opções.</div>}</div>
        <p className="cn-disclaimer">Imagens e características acima são ilustrativas, não representam anúncios ativos nem imóveis confirmados no estoque da Casas Net.</p>
      </section>
      <section className="cn-manifesto"><div className="cn-manifesto-image" role="img" aria-label="Interior contemporâneo iluminado" /><div className="cn-manifesto-content"><span className="cn-eyebrow"><span /> UMA NOVA EXPERIÊNCIA IMOBILIÁRIA</span><h2>Não é só sobre<br />encontrar um lugar.<br /><em>É sobre pertencer.</em></h2><p>Uma jornada mais simples, atenta e transparente — do primeiro clique até a visita ao imóvel que pode se tornar seu próximo lar.</p><a className="cn-text-link" href="#sobre">Conheça a Casas Net <span>↗</span></a></div></section>
      <section id="regioes" className="cn-areas section-pad"><div className="cn-section-heading"><div><span className="cn-eyebrow cn-eyebrow-dark">LUGARES PARA CHAMAR DE SEU</span><h2>Encontre seu lugar<br /><em>na região.</em></h2></div><p>Explore regiões e descubra o que combina com o seu próximo capítulo. A disponibilidade de imóveis varia conforme o estoque atualizado.</p></div><div className="cn-area-grid">{areas.slice(0, 6).map((area, i) => <button className="cn-area-tile" key={area} onClick={() => { setRegion(area); goToSearch(); }}><span>0{i + 1}</span><b>{area}</b><i>↗</i></button>)}</div></section>
      <section className="cn-owner"><div className="cn-owner-visual" /><div className="cn-owner-content"><span className="cn-eyebrow"><span /> PARA QUEM TEM UM IMÓVEL</span><h2>Seu imóvel merece<br />uma estratégia à<br /><em>altura do seu valor.</em></h2><p>Conte com uma apresentação cuidadosa e atendimento próximo para planejar os próximos passos da venda ou locação.</p><button className="cn-button cn-button-gold" onClick={() => setOwnerOpen(true)}>Quero anunciar meu imóvel <span>↗</span></button><small>Serviços de fotografia, vídeo e drone dependem da disponibilidade e das condições contratadas.</small></div></section>
      <section id="sobre" className="cn-about section-pad"><span className="cn-eyebrow cn-eyebrow-dark">CASAS NET IMÓVEIS · CRECI 38.227-J</span><h2>Boas escolhas começam<br />com uma boa <em>conversa.</em></h2><p>Estamos aqui para entender o que você procura e ajudar a dar o próximo passo com clareza.</p><button className="cn-button cn-button-dark" onClick={() => setOwnerOpen(true)}>Fale com nossa equipe <span>↗</span></button></section>
      <footer className="cn-footer"><a className="cn-wordmark cn-wordmark-footer" href="#inicio"><span className="cn-logo-mark">⌂</span><span><b>CASASNET</b><small>IMÓVEIS · CRECI 38.227-J</small></span></a><div className="cn-footer-links"><a href="#imoveis">Encontrar imóvel</a><a href="#exclusividades">Exclusividades</a><a href="#regioes">Regiões</a><button onClick={() => setOwnerOpen(true)}>Anuncie seu imóvel</button></div><p>© {new Date().getFullYear()} Casas Net Imóveis. Todos os direitos reservados.</p><small>Site demonstrativo. Anúncios, integrações e canais oficiais precisam ser configurados antes da publicação comercial.</small></footer>
      {ownerOpen && <div className="cn-modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) { setOwnerOpen(false); setSent(false); } }}><section className="cn-modal" role="dialog" aria-modal="true" aria-labelledby="cn-modal-title"><button className="cn-modal-close" onClick={() => { setOwnerOpen(false); setSent(false); }} aria-label="Fechar">×</button>{sent ? <div className="cn-success"><span>✓</span><h2>Obrigado pelo interesse.</h2><p>Este protótipo não transmite os dados. A equipe técnica precisa conectar o formulário a um canal seguro antes do lançamento.</p><button className="cn-button cn-button-dark" onClick={() => { setOwnerOpen(false); setSent(false); }}>Entendi</button></div> : <><span className="cn-eyebrow cn-eyebrow-dark">FALE COM A CASAS NET</span><h2 id="cn-modal-title">Vamos conversar sobre<br /><em>seu imóvel.</em></h2><p>Preencha seus dados para simular a experiência de captação.</p><form className="cn-owner-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}><label>Seu nome<input required name="name" placeholder="Como podemos chamar você?" /></label><label>WhatsApp<input required name="phone" type="tel" placeholder="(11) 99999-9999" /></label><label>E-mail<input name="email" type="email" placeholder="voce@email.com" /></label><label>O que você deseja?<select name="intent"><option>Vender um imóvel</option><option>Alugar um imóvel</option><option>Comprar um imóvel</option><option>Alugar um imóvel para morar</option></select></label><label className="cn-consent"><input required type="checkbox" /> Concordo em ser contatado sobre minha solicitação e li a política de privacidade.</label><button className="cn-button cn-button-dark" type="submit">Enviar solicitação <span>↗</span></button><small>Protótipo demonstrativo: nenhum dado é enviado ou armazenado por este formulário.</small></form></>}</section></div>}
    </main>
  );
}
