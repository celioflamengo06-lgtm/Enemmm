require('dotenv').config();
const express = require('express');
const path    = require('path');
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

// ── GET /api/cpf ──────────────────────────────────────────────────────────────
app.get('/api/cpf', async (req, res) => {
  const cpfLimpo = (req.query.cpf || '').replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ success: false, erro: 'CPF inválido.' });
  }

  try {
    const url = `https://magmadatahub.com/api.php?token=${process.env.CPF_API_TOKEN}&cpf=${cpfLimpo}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ success: false, erro: 'Erro na base externa.' });
    }

    const data = await response.json();

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

  try {
    const response = await fetch('https://api.gothampaybr.com/api/v1/pix/cashin', {
      method: 'POST',
      headers: {
        'X-Client-Id':     process.env.GOTHAM_CLIENT_ID,
        'X-Client-Secret': process.env.GOTHAM_CLIENT_SECRET,
        'Content-Type':    'application/json'
      },
      body: JSON.stringify({
        nome,
        cpf,
        valor:    85,
        descricao: 'Caderno Falante'
      })
    });

    const data = await response.json();

    if (supabase && data.id) {
      await supabase.from('pagamentos').insert({
        gotham_id:    data.id,
        nome,
        cpf,
        valor:        85,
        status:       data.status,
        qr_code_text: data.qr_code_text,
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
