const test = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../api/scan-receipt.js");

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = value || "";
    },
    json() {
      return this.body ? JSON.parse(this.body) : null;
    },
  };
}

function makeRequest(overrides) {
  return Object.assign({
    method: "POST",
    headers: {
      origin: "https://finance.test",
      "x-real-ip": "test-" + Math.random().toString(36).slice(2),
    },
    body: { image: "not-an-image", today: "2026-11-25" },
  }, overrides || {});
}

test.beforeEach(() => {
  process.env.APP_ORIGIN = "https://finance.test";
  delete process.env.ALLOWED_ORIGINS;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.VERCEL_URL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL;
  delete process.env.OPENAI_RECEIPT_MODEL;
});

test("bloqueia origens que não estão na lista permitida", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const req = makeRequest({
    headers: { origin: "https://outside.test", "x-real-ip": "origin-test" },
  });
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.json().error, /Origem não autorizada/);
});

test("retorna 503 quando não há chave da OpenAI, chave do Gateway ou OIDC", async () => {
  const req = makeRequest({
    headers: { origin: "https://finance.test", "x-real-ip": "missing-key-test" },
    body: { image: "data:image/jpeg;base64," + "A".repeat(200), today: "2026-11-25" },
  });
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 503);
  assert.match(res.json().error, /credenciais no servidor|AI_GATEWAY_API_KEY/);
});

test("usa OIDC da Vercel pelo AI Gateway sem exigir OPENAI_API_KEY", async () => {
  process.env.VERCEL = "1";
  const originalFetch = global.fetch;
  let capturedRequest;

  global.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          output_text: JSON.stringify({
            estabelecimento: "Padaria Exemplo",
            valor: 18.9,
            data: "2026-11-25",
            categoria: "Alimentação",
          }),
        };
      },
    };
  };

  try {
    const req = makeRequest({
      headers: {
        origin: "https://finance.test",
        "x-real-ip": "gateway-oidc-test",
        "x-vercel-oidc-token": "test-vercel-oidc-token",
      },
      body: {
        image: "data:image/jpeg;base64," + "A".repeat(200),
        today: "2026-11-25",
      },
    });
    const res = makeResponse();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(capturedRequest.url, "https://ai-gateway.vercel.sh/v1/responses");
    assert.equal(capturedRequest.options.headers.Authorization, "Bearer test-vercel-oidc-token");
    const requestBody = JSON.parse(capturedRequest.options.body);
    assert.equal(requestBody.model, "openai/gpt-4o-mini");
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.text.format.type, "json_schema");
    assert.deepEqual(res.json().data, {
      estabelecimento: "Padaria Exemplo",
      valor: 18.9,
      data: "2026-11-25",
      categoria: "Alimentação",
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("rejeita imagem inválida antes de chamar a OpenAI", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("fetch não deveria ser chamado");
  };

  try {
    const req = makeRequest({ body: { image: "texto", today: "2026-11-25" } });
    const res = makeResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error, /Imagem inválida|Formato de imagem/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("retorna os campos da nota em JSON estruturado e valida o valor", async () => {
  process.env.OPENAI_API_KEY = "test-secret-key";
  const originalFetch = global.fetch;
  let capturedRequest;

  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    capturedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          output_text: JSON.stringify({
            estabelecimento: "Mercado Exemplo",
            valor: 123.45,
            data: "2026-11-24",
            categoria: "Alimentação",
          }),
        };
      },
    };
  };

  try {
    const req = makeRequest({
      body: {
        image: "data:image/jpeg;base64," + "A".repeat(200),
        today: "2026-11-25",
      },
    });
    const res = makeResponse();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), {
      data: {
        estabelecimento: "Mercado Exemplo",
        valor: 123.45,
        data: "2026-11-24",
        categoria: "Alimentação",
      },
    });
    assert.equal(capturedRequest.options.headers.Authorization, "Bearer test-secret-key");
    const requestBody = JSON.parse(capturedRequest.options.body);
    assert.equal(requestBody.model, "gpt-4o-mini");
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.input[0].content[1].type, "input_image");
    assert.equal(requestBody.text.format.type, "json_schema");
    assert.equal(res.headers["cache-control"], "no-store, max-age=0");
  } finally {
    global.fetch = originalFetch;
  }
});

test("não aceita total igual a zero ou negativo", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        output_text: JSON.stringify({
          estabelecimento: "Loja Exemplo",
          valor: 0,
          data: "2026-11-24",
          categoria: "Compras",
        }),
      };
    },
  });

  try {
    const req = makeRequest({
      body: {
        image: "data:image/jpeg;base64," + "A".repeat(200),
        today: "2026-11-25",
      },
    });
    const res = makeResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 422);
    assert.match(res.json().error, /valor total com segurança/);
  } finally {
    global.fetch = originalFetch;
  }
});
