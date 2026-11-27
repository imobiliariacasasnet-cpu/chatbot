"use client";

import { useMemo, useState, type FormEvent } from "react";
import "./casas-net.css";

type Listing = {
  code: string;
  title: string;
  type: "Casa" | "Apartamento";
  location: string;
  details: string;
  salePrice: number | null;
  rentPrice: number | null;
  priceNote?: string;
  image: string;
  url: string;
};

const WHATSAPP_NUMBER = "5511937253232";
const officialPortal = "https://www.imobiliariacasasnet.com.br/";

const listings: Listing[] = [
  {
    code: "CA1735",
    title: "Casa nova no Reserva Roselândia",
    type: "Casa",
    location: "Jardim Rosemary · Itapevi",
    details: "115 m² construídos · 3 dormitórios · 1 suíte · 3 vagas",
    salePrice: 750000,
    rentPrice: null,
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85",
    url: "https://www.imobiliariacasasnet.com.br/imovel/casa-de-condominio-com-3-quartos-a-venda-e-3-vagas-bairro-jardim-rosemary-em-itapevi/CA1735",
  },
  {
    code: "CA1482",
    title: "Casa no condomínio Terra Nobre",
    type: "Casa",
    location: "Sítio Boa Vista · Cotia",
    details: "112 m² · 3 dormitórios · 1 suíte · 2 vagas",
    salePrice: 620000,
    rentPrice: 3800,
    priceNote: "Na locação, consulte encargos e pacote atualizado.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85",
    url: "https://www.imobiliariacasasnet.com.br/imovel/casa-de-condominio-com-3-quartos-a-venda-e-para-alugar-e-2-vagas-terra-nobre-bairro-sitio-boa-vista-em-cotia/CA1482",
  },
  {
    code: "AP0033",
    title: "Apartamento no Green Land",
    type: "Apartamento",
    location: "Jardim Caiapiá · Cotia",
    details: "56 m² · 2 dormitórios · 1 banheiro · 1 vaga",
    salePrice: 220000,
    rentPrice: null,
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85",
    url: "https://www.imobiliariacasasnet.com.br/imovel/apartamento-com-2-quartos-a-venda-e-1-vaga-bairro-jardim-caiapia-em-cotia/AP0033",
  },
  {
    code: "CA1405",
    title: "Casa no Pinheiros Tênis Village",
    type: "Casa",
    location: "Caucaia do Alto · Cotia",
    details: "219 m² de área total · 3 dormitórios · 2 vagas",
    salePrice: 800000,
    rentPrice: 5000,
    priceNote: "Confirme o pacote de locação e os encargos no anúncio.",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85",
    url: "https://www.imobiliariacasasnet.com.br/imovel/casa-de-condominio-com-3-quartos-a-venda-e-para-alugar-e-2-vagas-bairro-dos-pereiras-caucaia-do-alto-em-cotia/CA1405",
  },
];

const areas = [
  "Cotia",
  "Granja Viana",
  "Raposo Tavares",
  "Itapevi",
  "Vargem Grande Paulista",
  "Carapicuíba",
  "Embu das Artes",
];

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function whatsappUrl(message: string) {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
}

export default function CasasNetHomePage() {
  const [purpose, setPurpose] = useState<"Comprar" | "Alugar">("Comprar");
  const [kind, setKind] = useState("Todos os tipos");
  const [region, setRegion] = useState("");
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prepared, setPrepared] = useState(false);

  const visibleListings = useMemo(
    () =>
      listings.filter((listing) => {
        const price = purpose === "Comprar" ? listing.salePrice : listing.rentPrice;
        const haystack = (
          listing.title +
          " " +
          listing.type +
          " " +
          listing.location +
          " " +
          listing.details +
          " " +
          listing.code
        ).toLowerCase();

        return (
          price !== null &&
          (kind === "Todos os tipos" || listing.type === kind) &&
          (!region ||
            listing.location.toLowerCase().includes(region.toLowerCase()) ||
            listing.title.toLowerCase().includes(region.toLowerCase())) &&
          haystack.includes(query.toLowerCase().trim()) &&
          (!maxPrice || price <= Number(maxPrice))
        );
      }),
    [kind, maxPrice, purpose, query, region],
  );

  function goToListings() {
    document.getElementById("imoveis")?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  function resetFilters() {
    setKind("Todos os tipos");
    setRegion("");
    setQuery("");
    setMaxPrice("");
    setPurpose("Comprar");
  }

  function submitOwnerLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const intent = String(data.get("intent") || "").trim();
    const city = String(data.get("city") || "").trim();
    const message = [
      "Olá, Casas Net! Gostaria de falar sobre um imóvel.",
      "",
      "Nome: " + name,
      "WhatsApp: " + phone,
      "E-mail: " + (email || "Não informado"),
      "Interesse: " + intent,
      "Cidade/região: " + (city || "Não informada"),
      "",
      "Envio esta solicitação pelo site da Casas Net.",
    ].join("\n");

    window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
    setPrepared(true);
  }

  return (
    <main className="cn-site" id="inicio">
      <a className="cn-skip-link" href="#conteudo">Pular para o conteúdo</a>

      <div className="cn-topline">
        <span>CASAS NET IMÓVEIS</span>
        <span>Seu próximo capítulo começa aqui.</span>
        <a href="https://wa.me/5511937253232" target="_blank" rel="noreferrer">
          WhatsApp · (11) 93725-3232
        </a>
      </div>

      <header className="cn-header">
        <a className="cn-wordmark" href="#inicio" aria-label="Casas Net — início">
          <span className="cn-logo-mark" aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><circle cx="18" cy="18" r="16.5" /><path d="M8.5 17.3 18 9l9.5 8.3M11.5 16.2V27h13V16.2M16 27v-6.5h4V27" /></svg></span>
          <span><b>CASASNET</b><small>IMÓVEIS · CRECI 38.227-J</small></span>
        </a>

        <nav className="cn-nav" aria-label="Navegação principal">
          <a href="#imoveis">Encontrar imóvel</a>
          <a href="#experiencia">Nossa experiência</a>
          <a href="#regioes">Regiões</a>
          <a href="#sobre">A Casas Net</a>
        </nav>

        <div className="cn-header-actions">
          <button className="cn-header-cta" onClick={() => setOwnerOpen(true)}>
            Anuncie seu imóvel <span>↗</span>
          </button>
          <button
            className="cn-menu-toggle"
            type="button"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span /><span />
          </button>
        </div>

        {mobileOpen && (
          <nav className="cn-mobile-nav" aria-label="Navegação para celular">
            <a href="#imoveis" onClick={() => setMobileOpen(false)}>Encontrar imóvel</a>
            <a href="#experiencia" onClick={() => setMobileOpen(false)}>Nossa experiência</a>
            <a href="#regioes" onClick={() => setMobileOpen(false)}>Regiões</a>
            <a href="#sobre" onClick={() => setMobileOpen(false)}>A Casas Net</a>
            <button onClick={() => { setOwnerOpen(true); setMobileOpen(false); }}>
              Anunciar um imóvel <span>↗</span>
            </button>
          </nav>
        )}
      </header>

      <div id="conteudo">
        <section className="cn-hero" aria-labelledby="cn-hero-title">
          <div className="cn-hero-image" aria-hidden="true" />
          <div className="cn-hero-gradient" />
          <div className="cn-hero-content">
            <p className="cn-eyebrow"><span /> CASAS NET IMÓVEIS · CRECI 38.227-J</p>
            <h1 id="cn-hero-title">Seu próximo<br />capítulo <em>começa</em><br />aqui.</h1>
            <p className="cn-hero-copy">
              Encontre um espaço que combina com a vida que você quer viver.
              Uma experiência imobiliária com mais clareza, cuidado e proximidade.
            </p>
            <div className="cn-hero-actions">
              <button className="cn-button cn-button-gold" onClick={goToListings}>
                Encontrar meu imóvel <span>↗</span>
              </button>
              <button className="cn-button cn-button-glass" onClick={() => setOwnerOpen(true)}>
                Quero anunciar <span>↗</span>
              </button>
            </div>
            <div className="cn-hero-note">
              <span className="cn-note-line" />
              Cotia, Granja Viana, Raposo Tavares e região
            </div>
          </div>
          <div className="cn-hero-index"><b>CASAS NET</b><span>·</span> IMÓVEIS</div>
          <a href="#imoveis" className="cn-scroll">EXPLORE <span>↓</span></a>
        </section>

        <section id="imoveis" className="cn-search-wrap" aria-labelledby="cn-search-title">
          <div className="cn-search-intro">
            <span className="cn-eyebrow cn-eyebrow-dark">ENCONTRE SEU LUGAR</span>
            <h2 id="cn-search-title">Seu espaço.<br /><em>Seu jeito.</em></h2>
            <p>Explore a seleção e abra o anúncio oficial para conferir fotos e informações completas.</p>
          </div>

          <div className="cn-search-panel">
            <div className="cn-purpose-switch" role="group" aria-label="Finalidade do imóvel">
              <button className={purpose === "Comprar" ? "active" : ""} onClick={() => setPurpose("Comprar")}>Comprar</button>
              <button className={purpose === "Alugar" ? "active" : ""} onClick={() => setPurpose("Alugar")}>Alugar</button>
            </div>
            <div className="cn-fields">
              <label>
                <span>TIPO DE IMÓVEL</span>
                <select value={kind} onChange={(event) => setKind(event.target.value)}>
                  <option>Todos os tipos</option>
                  <option>Casa</option>
                  <option>Apartamento</option>
                </select>
              </label>
              <label>
                <span>CIDADE, REGIÃO OU CONDOMÍNIO</span>
                <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Ex.: Cotia" list="cn-areas" />
                <datalist id="cn-areas">
                  {areas.map((area) => <option key={area} value={area} />)}
                </datalist>
              </label>
              <label>
                <span>PALAVRA-CHAVE OU CÓDIGO</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: condomínio, CA1735" />
              </label>
              <label className="cn-budget-field">
                <span>PREÇO MÁXIMO (R$)</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder={purpose === "Comprar" ? "Ex.: 750000" : "Ex.: 5000"}
                />
              </label>
              <button className="cn-search-button" onClick={goToListings}>
                <span aria-hidden="true">⌕</span> Ver resultados <small>({visibleListings.length})</small>
              </button>
            </div>
            <div className="cn-search-hint">
              Os filtros atuam sobre esta seleção de anúncios. Para conferir o estoque completo, acesse o{" "}
              <a href={officialPortal} target="_blank" rel="noreferrer">portal oficial da Casas Net ↗</a>.
            </div>
          </div>
        </section>

        <section id="exclusividades" className="cn-exclusive section-pad" aria-labelledby="cn-listings-title">
          <div className="cn-section-heading">
            <div>
              <span className="cn-eyebrow"><span /> SELEÇÃO CASAS NET</span>
              <h2 id="cn-listings-title">Espaços que podem<br /><em>combinar com você.</em></h2>
            </div>
            <p>
              Uma seleção de anúncios publicados no portal da Casas Net.
              Abra cada anúncio para conferir as imagens da unidade e as condições atualizadas.
            </p>
          </div>

          <div className="cn-listing-toolbar">
            <p aria-live="polite">
              <strong>{visibleListings.length}</strong> {visibleListings.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
              <span> · {purpose === "Comprar" ? "À venda" : "Para locação"}</span>
            </p>
            <button className="cn-reset-filters" onClick={resetFilters}>Limpar filtros</button>
          </div>

          <div className="cn-property-grid">
            {visibleListings.map((home) => {
              const price = purpose === "Comprar" ? home.salePrice : home.rentPrice;
              const priceLabel = price === null ? "Consulte a equipe" : money(price) + (purpose === "Alugar" ? "/mês" : "");
              const contactMessage = "Olá, Casas Net! Tenho interesse no imóvel " + home.code + " — " + home.title + ". Gostaria de confirmar disponibilidade e agendar uma visita.";
              return (
                <article className="cn-property-card" key={home.code}>
                  <a className="cn-property-image-wrap" href={home.url} target="_blank" rel="noreferrer" aria-label={"Ver anúncio oficial do imóvel " + home.code}>
                    <img
                      src={home.image}
                      alt={"Foto ilustrativa de referência para " + home.title + ". A foto real está no anúncio oficial."}
                      className="cn-property-image"
                      loading="lazy"
                    />
                    <span className="cn-property-tag">FOTO ILUSTRATIVA</span>
                    <span className="cn-photo-count">ANÚNCIO {home.code}</span>
                  </a>
                  <div className="cn-property-info">
                    <span className="cn-property-location">{home.location}</span>
                    <h3><a href={home.url} target="_blank" rel="noreferrer">{home.title}</a></h3>
                    <p>{home.details}</p>
                    <div className="cn-property-bottom">
                      <div className="cn-price-stack">
                        <span className="cn-price-demo">{priceLabel}</span>
                        {purpose === "Alugar" && home.priceNote ? <small>{home.priceNote}</small> : null}
                      </div>
                      <a className="cn-property-arrow" href={home.url} target="_blank" rel="noreferrer" aria-label={"Abrir anúncio " + home.code}>↗</a>
                    </div>
                    <div className="cn-property-actions">
                      <a href={home.url} target="_blank" rel="noreferrer">Ver anúncio oficial <span>↗</span></a>
                      <a href={whatsappUrl(contactMessage)} target="_blank" rel="noreferrer">Agendar visita <span>↗</span></a>
                    </div>
                  </div>
                </article>
              );
            })}
            {visibleListings.length === 0 && (
              <div className="cn-no-results">
                <h3>Nenhum imóvel encontrado com esses filtros.</h3>
                <p>Tente outro bairro, ajuste o preço máximo ou consulte o estoque completo no portal oficial.</p>
                <button className="cn-button cn-button-gold" onClick={resetFilters}>Limpar filtros <span>↗</span></button>
                <a href={officialPortal} target="_blank" rel="noreferrer">Ver todos os imóveis da Casas Net</a>
              </div>
            )}
          </div>

          <p className="cn-disclaimer">
            Valores e disponibilidade podem mudar sem aviso prévio. As fotos de referência nesta página não são fotos confirmadas das unidades; consulte as imagens e os dados diretamente no anúncio oficial.
          </p>
          <div className="cn-more-listings">
            <a href={officialPortal} target="_blank" rel="noreferrer">Explorar o portal completo da Casas Net <span>↗</span></a>
          </div>
        </section>

        <section id="experiencia" className="cn-manifesto" aria-labelledby="cn-experience-title">
          <div className="cn-manifesto-image" role="img" aria-label="Ambiente residencial contemporâneo usado como referência visual" />
          <div className="cn-manifesto-content">
            <span className="cn-eyebrow"><span /> UMA EXPERIÊNCIA MAIS HUMANA</span>
            <h2 id="cn-experience-title">Não é só sobre<br />encontrar um lugar.<br /><em>É sobre pertencer.</em></h2>
            <p>
              Uma jornada mais simples, atenta e transparente — do primeiro contato
              até a visita ao imóvel que pode se tornar seu próximo lar.
            </p>
            <a className="cn-text-link" href="#sobre">Conheça a Casas Net <span>↗</span></a>
          </div>
        </section>

        <section id="regioes" className="cn-areas section-pad" aria-labelledby="cn-areas-title">
          <div className="cn-section-heading">
            <div>
              <span className="cn-eyebrow cn-eyebrow-dark">LUGARES PARA CHAMAR DE SEU</span>
              <h2 id="cn-areas-title">Encontre seu lugar<br /><em>na região.</em></h2>
            </div>
            <p>
              Explore algumas das regiões atendidas pela Casas Net. A seleção de imóveis
              e a disponibilidade variam conforme o estoque publicado.
            </p>
          </div>
          <div className="cn-area-grid">
            {areas.slice(0, 6).map((area, index) => (
              <button className="cn-area-tile" key={area} onClick={() => { setRegion(area); goToListings(); }}>
                <span>0{index + 1}</span>
                <b>{area}</b>
                <i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>
        </section>

        <section className="cn-owner" aria-labelledby="cn-owner-title">
          <div className="cn-owner-visual" role="img" aria-label="Casa contemporânea, imagem de referência" />
          <div className="cn-owner-content">
            <span className="cn-eyebrow"><span /> PARA QUEM TEM UM IMÓVEL</span>
            <h2 id="cn-owner-title">Seu imóvel merece<br />uma estratégia à<br /><em>altura do seu valor.</em></h2>
            <p>
              Conte com atendimento próximo e uma estratégia de apresentação
              para planejar a venda ou locação da sua propriedade.
            </p>
            <button className="cn-button cn-button-gold" onClick={() => setOwnerOpen(true)}>
              Quero anunciar meu imóvel <span>↗</span>
            </button>
            <small>Serviços de fotografia, vídeo e drone dependem da disponibilidade e das condições contratadas.</small>
          </div>
        </section>

        <section id="sobre" className="cn-about section-pad" aria-labelledby="cn-about-title">
          <span className="cn-eyebrow cn-eyebrow-dark">CASAS NET IMÓVEIS · CRECI 38.227-J</span>
          <h2 id="cn-about-title">Boas escolhas começam<br />com uma boa <em>conversa.</em></h2>
          <p>Atendimento imobiliário em Cotia, Granja Viana e região oeste de São Paulo.</p>
          <div className="cn-about-actions">
            <a className="cn-button cn-button-dark" href="https://wa.me/5511937253232" target="_blank" rel="noreferrer">
              Fale com nossa equipe <span>↗</span>
            </a>
            <a className="cn-about-phone" href="tel:+5511937253232">(11) 93725-3232</a>
          </div>
        </section>
      </div>

      <footer className="cn-footer">
        <a className="cn-wordmark cn-wordmark-footer" href="#inicio">
          <span className="cn-logo-mark" aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><circle cx="18" cy="18" r="16.5" /><path d="M8.5 17.3 18 9l9.5 8.3M11.5 16.2V27h13V16.2M16 27v-6.5h4V27" /></svg></span>
          <span><b>CASASNET</b><small>IMÓVEIS · CRECI 38.227-J</small></span>
        </a>
        <div className="cn-footer-links">
          <a href="#imoveis">Encontrar imóvel</a>
          <a href="#experiencia">Nossa experiência</a>
          <a href="#regioes">Regiões</a>
          <button onClick={() => setOwnerOpen(true)}>Anuncie seu imóvel</button>
          <a href={officialPortal} target="_blank" rel="noreferrer">Portal oficial ↗</a>
        </div>
        <p>© {new Date().getFullYear()} Casas Net Imóveis. CRECI 38.227-J.</p>
        <small>Os anúncios do portal são a referência para confirmar preço, fotos, condições e disponibilidade. Esta página pode refletir informações diferentes até que uma integração de estoque seja configurada.</small>
      </footer>

      <a className="cn-whatsapp-float" href={whatsappUrl("Olá, Casas Net! Gostaria de receber ajuda para encontrar um imóvel.")} target="_blank" rel="noreferrer" aria-label="Falar com a Casas Net pelo WhatsApp">
        <span aria-hidden="true">◔</span><b>Falar com a Casas Net</b>
      </a>

      {ownerOpen && (
        <div
          className="cn-modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOwnerOpen(false);
              setPrepared(false);
            }
          }}
        >
          <section className="cn-modal" role="dialog" aria-modal="true" aria-labelledby="cn-modal-title">
            <button className="cn-modal-close" onClick={() => { setOwnerOpen(false); setPrepared(false); }} aria-label="Fechar formulário">×</button>
            {prepared ? (
              <div className="cn-success">
                <span>✓</span>
                <h2>Sua mensagem está pronta.</h2>
                <p>O WhatsApp foi aberto com os dados preenchidos. Confira a mensagem e toque em enviar no próprio WhatsApp para concluir o contato.</p>
                <a className="cn-button cn-button-dark" href={whatsappUrl("Olá, Casas Net! Quero anunciar meu imóvel.")} target="_blank" rel="noreferrer">Abrir WhatsApp novamente <span>↗</span></a>
                <button className="cn-modal-back" onClick={() => { setOwnerOpen(false); setPrepared(false); }}>Fechar</button>
              </div>
            ) : (
              <>
                <span className="cn-eyebrow cn-eyebrow-dark">FALE COM A CASAS NET</span>
                <h2 id="cn-modal-title">Vamos conversar sobre<br /><em>seu imóvel.</em></h2>
                <p>Preencha os campos e prepare uma mensagem para nossa equipe no WhatsApp.</p>
                <form className="cn-owner-form" onSubmit={submitOwnerLead}>
                  <label>Seu nome<input required name="name" autoComplete="name" placeholder="Como podemos chamar você?" /></label>
                  <label>WhatsApp<input required name="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
                  <label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@email.com" /></label>
                  <label>O que você deseja?
                    <select name="intent">
                      <option>Vender um imóvel</option>
                      <option>Alugar um imóvel</option>
                      <option>Comprar um imóvel</option>
                      <option>Alugar um imóvel para morar</option>
                    </select>
                  </label>
                  <label>Cidade ou região<input name="city" placeholder="Ex.: Cotia, Granja Viana" /></label>
                  <label className="cn-consent">
                    <input required type="checkbox" />
                    Autorizo o contato sobre esta solicitação e estou ciente de que a mensagem será aberta no WhatsApp para eu revisar e enviar.
                  </label>
                  <button className="cn-button cn-button-dark" type="submit">Preparar mensagem <span>↗</span></button>
                  <small>Os dados não são armazenados por este formulário. Eles só serão enviados pelo WhatsApp se você confirmar o envio no aplicativo.</small>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
