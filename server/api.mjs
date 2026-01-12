import http from 'node:http';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const port = Number(process.env.PORT || 8787);

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
};

const optionalEnv = (name, fallbackNames = []) => {
  const value = process.env[name];
  if (value) {
    return value;
  }
  for (const fallbackName of fallbackNames) {
    const fallbackValue = process.env[fallbackName];
    if (fallbackValue) {
      return fallbackValue;
    }
  }
  return undefined;
};

const requiredEnvAny = (names) => {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing env var (any of): ${names.join(', ')}`);
};

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
};

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization');
};

const sanitizeFilename = (value) => {
  const base = String(value || 'upload').split('/').pop().split('\\').pop();
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(0, 120) || 'upload';
};

const base64UrlEncode = (raw) => Buffer.from(raw, 'utf8').toString('base64url');
const base64UrlDecode = (b64) => Buffer.from(b64, 'base64url').toString('utf8');

const main = () => {
  let s3State;
  let supabaseState;
  const reportSubscribers = new Set();

  const getS3State = () => {
    if (s3State) {
      return s3State;
    }

    const bucket = requiredEnv('S3_BUCKET');
    const endpoint = optionalEnv('S3_ENDPOINT');
    const region = optionalEnv('S3_REGION', ['AWS_REGION', 'AWS_DEFAULT_REGION']);
    if (!region) {
      throw new Error('Missing env var (any of): S3_REGION, AWS_REGION, AWS_DEFAULT_REGION');
    }
    const accessKeyId = requiredEnvAny(['S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID']);
    const secretAccessKey = requiredEnvAny(['S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY']);
    const putExpiresIn = Number(process.env.S3_PUT_EXPIRES_SECONDS || 600);
    const getExpiresIn = Number(process.env.S3_GET_EXPIRES_SECONDS || 86400);
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

    const s3Config = {
      region,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    };
    if (endpoint) {
      s3Config.endpoint = endpoint;
    }

    const s3 = new S3Client(s3Config);
    s3State = { s3, bucket, putExpiresIn, getExpiresIn };
    return s3State;
  };

  const getSupabase = () => {
    if (supabaseState) {
      return supabaseState;
    }

    const url = requiredEnvAny(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
    const serviceRoleKey = requiredEnvAny(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE', 'SUPABASE_SERVICE_ROLE_TOKEN']);
    const usersTable = process.env.SUPABASE_USERS_TABLE || 'usuarios';
    const reportsTable = process.env.SUPABASE_REPORTS_TABLE || 'relatorios';
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    supabaseState = { client, usersTable, reportsTable };
    return supabaseState;
  };

  const getAvisaConfig = () => {
    const baseUrl = (process.env.AVISA_API_BASE_URL || 'https://www.avisaapi.com.br/api').replace(/\/+$/, '');
    const token = requiredEnvAny(['AVISA_API_TOKEN', 'VITE_UAZAPI_TOKEN']);
    return { baseUrl, token };
  };

  const getAuthSecret = () => requiredEnvAny(['AUTH_SESSION_SECRET', 'AUTH_JWT_SECRET']);

  const signSession = (payload) => {
    const secret = getAuthSecret();
    const data = base64UrlEncode(JSON.stringify(payload));
    const sig = createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
  };

  const verifySession = (token) => {
    const secret = getAuthSecret();
    const parts = String(token || '').split('.');
    if (parts.length !== 2) {
      return null;
    }
    const [data, sig] = parts;
    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return null;
      }
    } catch {
      return null;
    }
    try {
      const payload = JSON.parse(base64UrlDecode(data));
      if (!payload || typeof payload !== 'object') {
        return null;
      }
      if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  };

  const requireAuth = (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    const session = verifySession(token);
    if (!session) {
      json(res, 401, { error: 'Não autenticado' });
      return null;
    }
    return session;
  };

  const requireAdmin = (req, res) => {
    const session = requireAuth(req, res);
    if (!session) {
      return null;
    }
    if (session.role !== 'admin') {
      json(res, 403, { error: 'Acesso restrito ao admin' });
      return null;
    }
    return session;
  };

  const verifyPassword = (password, stored) => {
    const storedValue = String(stored || '');
    if (!storedValue) {
      return false;
    }
    if (/^\$2[aby]\$/.test(storedValue)) {
      return bcrypt.compareSync(password, storedValue);
    }
    return password === storedValue;
  };

  const proxyToAvisa = async (req, res, actionPath) => {
    const { baseUrl, token } = getAvisaConfig();
    const body = await readJsonBody(req);
    const upstreamUrl = `${baseUrl}${actionPath}`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    res.statusCode = upstreamResponse.status;
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    const data = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(data);
  };

  const sendSseEvent = (res, event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const broadcastReportEvent = (event, data) => {
    for (const res of reportSubscribers) {
      try {
        sendSseEvent(res, event, data);
      } catch {
        reportSubscribers.delete(res);
      }
    }
  };

  const server = http.createServer(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/health') {
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const session = requireAuth(req, res);
      if (!session) {
        return;
      }
      json(res, 200, { user: { uuid: session.uuid, email: session.email, role: session.role } });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/admin/reports') {
      const session = requireAdmin(req, res);
      if (!session) {
        return;
      }
      const { client, reportsTable } = getSupabase();
      const { data, error } = await client
        .from(reportsTable)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        json(res, 400, { error: error.message });
        return;
      }
      json(res, 200, { reports: data || [] });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/admin/reports/stream') {
      const session = requireAdmin(req, res);
      if (!session) {
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const { client, reportsTable } = getSupabase();
      const { data, error } = await client
        .from(reportsTable)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        sendSseEvent(res, 'error', { error: error.message });
      } else {
        sendSseEvent(res, 'init', { reports: data || [] });
      }

      res.write(': connected\n\n');
      reportSubscribers.add(res);
      const keepAlive = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          // ignore
        }
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAlive);
        reportSubscribers.delete(res);
      });
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    try {
      if (pathname === '/api/auth/login') {
        const body = await readJsonBody(req);
        const email = String(body?.email || '').trim().toLowerCase();
        const password = String(body?.password ?? body?.senha ?? '');
        if (!email || !password) {
          json(res, 400, { error: 'Email e senha são obrigatórios' });
          return;
        }

        const { client, usersTable } = getSupabase();
        const { data, error } = await client
          .from(usersTable)
          .select('uuid,email,senha,role')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          json(res, 400, { error: error.message });
          return;
        }
        if (!data) {
          json(res, 401, { error: 'Credenciais inválidas' });
          return;
        }

        const ok = verifyPassword(password, data.senha);
        if (!ok) {
          json(res, 401, { error: 'Credenciais inválidas' });
          return;
        }

        const role = data.role === 'admin' ? 'admin' : 'user';
        const token = signSession({
          uuid: String(data.uuid),
          email: String(data.email),
          role,
          exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 dias
        });

        json(res, 200, { token, user: { uuid: String(data.uuid), email: String(data.email), role } });
        return;
      }

      if (pathname === '/api/auth/logout') {
        json(res, 200, { ok: true });
        return;
      }

      if (pathname === '/api/reports') {
        const session = requireAuth(req, res);
        if (!session) {
          return;
        }

        const body = await readJsonBody(req);
        const reportId = randomUUID();
        const status = 'received';
        const nowIso = new Date().toISOString();

        const payload = {
          ...body,
          created_by: { uuid: session.uuid, email: session.email, role: session.role },
        };

        const { client, reportsTable } = getSupabase();
        const { data, error } = await client
          .from(reportsTable)
          .insert({
            id: reportId,
            status,
            created_at: nowIso,
            updated_at: nowIso,
            payload,
          })
          .select('*')
          .maybeSingle();

        if (error) {
          json(res, 400, { error: error.message });
          return;
        }

        broadcastReportEvent('report.created', data);
        json(res, 200, { report: data });
        return;
      }

      if (pathname === '/api/admin/reports/status') {
        const session = requireAdmin(req, res);
        if (!session) {
          return;
        }

        const body = await readJsonBody(req);
        const id = String(body?.id || '').trim();
        const status = String(body?.status || '').trim();
        if (!id || !['received', 'approved', 'rejected'].includes(status)) {
          json(res, 400, { error: 'id e status (received|approved|rejected) são obrigatórios' });
          return;
        }

        const nowIso = new Date().toISOString();
        const { client, reportsTable } = getSupabase();
        const { data, error } = await client
          .from(reportsTable)
          .update({
            status,
            updated_at: nowIso,
          })
          .eq('id', id)
          .select('*')
          .maybeSingle();

        if (error) {
          json(res, 400, { error: error.message });
          return;
        }
        if (!data) {
          json(res, 404, { error: 'Relatório não encontrado' });
          return;
        }

        broadcastReportEvent('report.updated', data);
        json(res, 200, { report: data });
        return;
      }

      if (pathname === '/api/actions/sendMessage') {
        const session = requireAuth(req, res);
        if (!session) {
          return;
        }
        await proxyToAvisa(req, res, '/actions/sendMessage');
        return;
      }

      if (pathname === '/api/actions/sendMedia') {
        const session = requireAuth(req, res);
        if (!session) {
          return;
        }
        await proxyToAvisa(req, res, '/actions/sendMedia');
        return;
      }

      if (pathname !== '/api/s3/presign') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const session = requireAuth(req, res);
      if (!session) {
        return;
      }

      const { s3, bucket, putExpiresIn, getExpiresIn } = getS3State();
      const body = await readJsonBody(req);
      const filename = sanitizeFilename(body?.filename);
      const contentType = typeof body?.contentType === 'string' && body.contentType.trim()
        ? body.contentType.trim()
        : 'application/octet-stream';

      const key = `uploads/${Date.now()}-${randomUUID()}-${filename}`;

      const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: putExpiresIn });

      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const fileUrl = await getSignedUrl(s3, getCommand, { expiresIn: getExpiresIn });

      json(res, 200, { uploadUrl, fileUrl });
    } catch (error) {
      json(res, 400, { error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port} (presign: /api/s3/presign)`);
  });
};

main();
