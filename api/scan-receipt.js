const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 10;
const MAX_IMAGE_DATA_URL_LENGTH = 3600000;
const CATEGORY_OPTIONS = [
  "Alimentação", "Transporte", "Saúde", "Lazer", "Moradia", "Contas",
  "Educação", "Compras", "Assinaturas", "Impostos", "Dívidas",
  "Cartão de crédito", "Outras despesas"
];

// Limite por instância: proteção básica. Em escala, use rate limit persistente/WAF.
const requestBuckets = new Map();

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(body));
}

function getOrigin(value) {
  try { return new URL(value).origin; } catch { return ""; }
}

function allowedOrigins() {
  const raw = [
    process.env.APP_ORIGIN || "",
    process.env.ALLOWED_ORIGINS || "",
    process.env.VERCEL_PROJECT_PRODUCTION_URL || "",
    process.env.VERCEL_URL || ""
  ].join(",");
  const origins = new Set();
  raw.split(",").map(function(s) { return s.trim(); }).filter(Boolean).forEach(function(entry) {
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(entry) ? entry : "https://" + entry;
    const origin = getOrigin(candidate);
    if (origin) origins.add(origin);
  });
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return origins;
}

function originIsAllowed(req) {
  const origin = req.headers.origin;
  return typeof origin === "string" && allowedOrigins().has(getOrigin(origin));
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function takeRateLimit(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = String(req.headers["x-real-ip"] || (Array.isArray(forwarded) ? forwarded[0] : forwarded) || "unknown")
    .split(",")[0].trim();
  const now = Date.now();
  const bucket = requestBuckets.get(ip);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(ip, { startedAt: now, count: 1 });
    if (requestBuckets.size > 1000) {
      for (const [key, value] of requestBuckets) {
        if (now - value.startedAt >= RATE_WINDOW_MS) requestBuckets.delete(key);
      }
    }
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader("Vary", "Origin");

  if (!originIsAllowed(req)) {
    return json(res, 403, { error: "Origem não autorizada. Abra o aplicativo pelo endereço oficial." });
  }

  res.setHeader("Access-Control-Allow-Origin", getOrigin(req.headers.origin));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return json(res, 405, { error: "Método não permitido." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return json(res, 503, {
      error: "A leitura inteligente ainda não foi configurada no servidor. Configure OPENAI_API_KEY na Vercel."
    });
  }
  if (!takeRateLimit(req)) {
    return json(res, 429, { error: "Muitas leituras em pouco tempo. Aguarde alguns minutos e tente novamente." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return json(res, 400, { error: "Não foi possível interpretar a solicitação." }); }
  }

  const image = body && body.image;
  if (typeof image !== "string" || image.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return json(res, 400, { error: "Imagem inválida ou muito grande. Tente uma foto mais nítida e menor." });
  }

  const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match || match[2].length < 100) {
    return json(res, 400, { error: "Formato de imagem não suportado. Use JPG, PNG, WebP ou GIF." });
  }

  const today = typeof body.today === "string" && isValidDate(body.today)
    ? body.today
    : new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      estabelecimento: {
        type: "string",
        description: "Nome do estabelecimento impresso na nota. Se ilegível, use Estabelecimento não identificado."
      },
      valor: {
        type: "number",
        description: "Valor total final a pagar, em reais, como número decimal, sem símbolo de moeda."
      },
      data: {
        type: "string",
        description: "Data no formato YYYY-MM-DD. Se a data estiver ausente ou ilegível, use a data provisória informada nas instruções."
      },
      categoria: {
        type: "string",
        enum: CATEGORY_OPTIONS,
        description: "Uma única categoria compatível com o aplicativo de finanças."
      }
    },
    required: ["estabelecimento", "valor", "data", "categoria"]
  };

  const prompt = [
    "Leia esta foto de uma nota fiscal, cupom ou recibo brasileiro e extraia somente os quatro campos definidos no JSON Schema.",
    "Use o total final efetivamente pago, depois de descontos; não use subtotal, troco, valor de parcela ou limite do cartão.",
    "Leia a data de emissão/compra e converta para YYYY-MM-DD.",
    "Classifique o gasto: supermercado, mercado, padaria e restaurante = Alimentação; combustível, pedágio, estacionamento e transporte = Transporte; farmácia, clínica e exames = Saúde; cinema, evento e lazer = Lazer; moradia = Moradia; contas de consumo = Contas; material escolar e cursos = Educação; compras diversas = Compras; assinatura recorrente = Assinaturas; taxas e tributos = Impostos; dívidas = Dívidas; quando nenhuma categoria específica servir = Outras despesas.",
    "Não invente o estabelecimento ou o valor. Se o valor total não estiver legível, retorne 0 para que o usuário possa tentar novamente.",
    "Data de hoje para uso apenas como data provisória se a nota não mostrar uma data legível: " + today + ".",
    "A saída deve obedecer estritamente ao esquema JSON e não incluir texto adicional."
  ].join(" ");

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RECEIPT_MODEL || "gpt-4o-mini",
        store: false,
        max_output_tokens: 300,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: image, detail: "high" }
          ]
        }],
        text: {
          format: {
            type: "json_schema",
            name: "receipt_data",
            strict: true,
            schema: schema
          }
        }
      })
    });
  } catch {
    return json(res, 502, { error: "Não foi possível conectar ao serviço de leitura. Tente novamente." });
  }

  if (!upstream.ok) {
    console.error("Receipt vision provider returned status", upstream.status);
    const status = upstream.status === 429 ? 429 : (upstream.status === 401 || upstream.status === 403 ? 503 : 502);
    return json(res, status, {
      error: upstream.status === 429
        ? "O serviço de leitura está temporariamente ocupado. Tente novamente em instantes."
        : "Não foi possível ler a nota fiscal agora. Confira a configuração do serviço e tente novamente."
    });
  }

  let result;
  try { result = await upstream.json(); }
  catch { return json(res, 502, { error: "O serviço de leitura retornou uma resposta inválida." }); }

  const outputText = result.output_text || (Array.isArray(result.output)
    ? result.output
        .filter(function(item) { return item && item.type === "message"; })
        .flatMap(function(item) { return Array.isArray(item.content) ? item.content : []; })
        .filter(function(item) { return item && item.type === "output_text"; })
        .map(function(item) { return item.text || ""; })
        .join("")
    : "");

  let data;
  try { data = JSON.parse(outputText); }
  catch { return json(res, 422, { error: "Não consegui interpretar os dados desta nota. Tente uma foto mais nítida." }); }

  const establishment = String(data.estabelecimento || "").trim().slice(0, 140);
  const amount = Number(data.valor);
  const date = isValidDate(String(data.data || "")) ? String(data.data) : today;
  const category = CATEGORY_OPTIONS.includes(data.categoria) ? data.categoria : "Outras despesas";

  if (!establishment || !Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
    return json(res, 422, {
      error: "Não consegui identificar o valor total com segurança. Tente tirar outra foto, focando o total da nota."
    });
  }

  return json(res, 200, {
    data: {
      estabelecimento: establishment,
      valor: Math.round(amount * 100) / 100,
      data: date,
      categoria: category
    }
  });
};
