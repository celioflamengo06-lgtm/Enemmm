require('dotenv').config();
const express = require('express');
const path    = require('path');
const https   = require('https');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Supabase ──────────────────────────────────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  console.log('Supabase conectado.');
} else {
  console.warn('Supabase não configurado — dados não serão persistidos.');
}

// ── Helper GET nativo ─────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    }).on('error', reject);
  });
}

// ── Helper POST nativo ────────────────────────────────────────────────────────
function httpPost(url, reqHeaders, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...reqHeaders
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── GET /api/cpf ──────────────────────────────────────────────────────────────
app.get('/api/cpf', async (req, res) => {
  const cpfLimpo = (req.query.cpf || '').replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ success: false, erro: 'CPF inválido.' });
  }

  if (!process.env.CPF_API_TOKEN) {
    return res.status(502).json({ success: false, erro: 'Token CPF não configurado.' });
  }

  try {
    const url = `https://magmadatahub.com/api.php?token=${process.env.CPF_API_TOKEN}&cpf=${cpfLimpo}`;
    const result = await httpGet(url);
    const data = JSON.parse(result.text);

    if (supabase && data.nome) {
      await supabase.from('leads').upsert(
        { cpf: cpfLimpo, nome: data.nome, nascimento: data.nascimento || null },
        { onConflict: 'cpf' }
      );
    }

    res.json(data);
  } catch (err) {
    console.error('[CPF]', err.message);
    res.status(502).json({ success: false, erro: 'Erro ao consultar CPF.' });
  }
});

// ── POST /api/pix ─────────────────────────────────────────────────────────────
app.post('/api/pix', async (req, res) => {
  const { nome, cpf } = req.body;
  if (!nome || !cpf) {
    return res.status(400).json({ message: 'Nome e CPF são obrigatórios.' });
  }

  const publicKey = process.env.SLIMMPAY_PUBLIC_KEY;
  const secretKey = process.env.SLIMMPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return res.status(502).json({ message: 'Credenciais Slimmpay não configuradas.' });
  }

  try {
    const cpfLimpo = cpf.replace(/\D/g, '');
    const basicToken = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

    const body = JSON.stringify({
      payment_method: 'pix',
      amount: 85,
      description: 'Livro Falante',
      customer: {
        name: nome,
        document: { type: 'cpf', number: cpfLimpo }
      }
    });

    const result = await httpPost(
      'https://api.slimmpay.com.br/v1/payment-transaction/create',
      { 'Authorization': `Basic ${basicToken}` },
      body
    );

    const data = JSON.parse(result.text);

    if (supabase && data.id) {
      await supabase.from('pagamentos').insert({
        gotham_id:    data.id,
        nome,
        cpf:          cpfLimpo,
        valor:        85,
        status:       data.status || 'PENDING',
        qr_code_text: data.qr_code_text || data.pix_copy_paste || null,
        expires_at:   data.expires_at || null
      });
    }

    res.json(data);
  } catch (err) {
    console.error('[PIX]', err.message);
    res.status(502).json({ message: 'Erro ao gerar PIX.' });
  }
});

// ── Fallback SPA ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
