const board = 'B3H8OXPA';
const listName = 'Pendientes';
const localOrigins = ['http://localhost:4321', 'http://127.0.0.1:4321'];
const livePath = '/solicitudes';

// El formulario importa esta lista durante la compilación de Astro.
export const topics = [
  'Crear cuenta FamilySearch',
  'Recuperar cuenta FamilySearch',
  'Armar el árbol familiar',
  'Buscar registros familiares',
  'Preparar nombres para las ordenanzas del templo',
  'Ayuda para reservar cita para el templo',
];

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== '/' && path !== livePath) return new Response(null, { status: 404 });
    const isTest = path === '/';
    const origin = request.headers.get('Origin');
    if (!origin || (isTest ? !localOrigins.includes(origin) : origin !== env.SITE_ORIGIN)) {
      return new Response(null, { status: 403 });
    }

    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    const reply = (status, ok = false) => Response.json({ ok }, { status, headers });

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': isTest ? 'Content-Type, X-Test-Key' : 'Content-Type',
        },
      });
    }

    if (isTest && request.method === 'GET') {
      return Response.json({ testPayloadVersion: 2 }, { headers });
    }

    if (!isTest && request.method === 'GET') {
      const ready = env.TRELLO_API_KEY && env.TRELLO_TOKEN && env.TURNSTILE_SECRET_KEY;
      return new Response(null, { status: ready ? 204 : 503, headers });
    }

    if (request.method !== 'POST') return reply(405);
    if (!env.TRELLO_API_KEY || !env.TRELLO_TOKEN) return reply(503);
    if (isTest && !env.TEST_KEY) return reply(503);
    if (isTest && request.headers.get('X-Test-Key') !== env.TEST_KEY) return reply(403);
    if (!isTest && !env.TURNSTILE_SECRET_KEY) return reply(503);

    const payload = await request.json().catch(() => null);
    const firstName = typeof payload?.firstName === 'string' ? payload.firstName.trim() : '';
    const whatsapp = typeof payload?.whatsapp === 'string' ? payload.whatsapp.trim() : '';
    const topic = typeof payload?.topic === 'string' ? payload.topic.trim() : '';
    if (!firstName || firstName.length > 80 || !/^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u.test(firstName)) return reply(400);
    if (whatsapp.length > 30 || !/^\+?[0-9(). -]+$/.test(whatsapp) || !/^\d{7,15}$/.test(whatsapp.replace(/\D/g, ''))) {
      return reply(400);
    }
    if (!topics.includes(topic)) return reply(400);

    const trelloHeaders = {
      Authorization: `OAuth oauth_consumer_key="${env.TRELLO_API_KEY}", oauth_token="${env.TRELLO_TOKEN}"`,
      Accept: 'application/json',
    };

    try {
      const signal = AbortSignal.timeout(12000);
      if (!isTest) {
        const token = payload?.turnstileToken;
        if (typeof token !== 'string' || !token || token.length > 2048) return reply(403);
        const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
          signal,
        });
        if (!verification.ok) return reply(502);
        const challenge = await verification.json();
        if (challenge.success !== true || challenge.hostname !== new URL(origin).hostname || challenge.action !== 'solicitud') {
          return reply(403);
        }

        const boardInfo = await fetch(`https://api.trello.com/1/boards/${board}?fields=prefs`, {
          headers: trelloHeaders,
          signal,
        });
        if (!boardInfo.ok) return reply(502);
        if ((await boardInfo.json()).prefs?.permissionLevel !== 'private') return reply(503);
      }

      const lists = await fetch(`https://api.trello.com/1/boards/${board}/lists?filter=open&fields=name`, {
        headers: trelloHeaders,
        signal,
      });
      if (!lists.ok) return reply(502);

      const matches = (await lists.json()).filter((list) => list.name === listName);
      if (matches.length !== 1) return reply(502);

      const card = await fetch('https://api.trello.com/1/cards', {
        method: 'POST',
        headers: { ...trelloHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idList: matches[0].id,
          name: isTest ? `[PRUEBA] ${topic}` : topic,
          desc: [
            isTest ? 'Solicitud de prueba del formulario.' : 'Solicitud de apoyo recibida desde la página del barrio.',
            `Nombre de pila: ${firstName}`,
            `${isTest ? 'WhatsApp ficticio' : 'WhatsApp'}: ${whatsapp}`,
          ].join('\n\n'),
        }),
        signal,
      });
      return card.ok ? reply(201, true) : reply(502);
    } catch {
      return reply(502);
    }
  },
};
