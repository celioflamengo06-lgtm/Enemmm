const https = require('https');

function requestPost(url, reqHeaders, body) {
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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Método não permitido.' }) };
  }

  const publicKey = process.env.SLIMMPAY_PUBLIC_KEY;
  const secretKey = process.env.SLIMMPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return { statusCode: 502, headers, body: JSON.stringify({ message: 'Credenciais Slimmpay não configuradas.' }) };
  }

  let nome, cpf;
  try {
    const parsed = JSON.parse(event.body || '{}');
    nome = parsed.nome;
    cpf = parsed.cpf;
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Body inválido.' }) };
  }

  if (!nome || !cpf) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Nome e CPF são obrigatórios.' }) };
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

    const result = await requestPost(
      'https://api.slimmpay.com.br/v1/payment-transaction/create',
      { 'Authorization': `Basic ${basicToken}` },
      body
    );

    console.log('[PIX] Status:', result.status, 'Body:', result.text.slice(0, 300));

    let data;
    try {
      data = JSON.parse(result.text);
    } catch (e) {
      return { statusCode: 502, headers, body: JSON.stringify({ message: 'Resposta inválida da Slimmpay.' }) };
    }

    if (result.status < 200 || result.status >= 300) {
      return { statusCode: result.status, headers, body: JSON.stringify({ message: data.message || 'Erro ao gerar PIX.' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    console.error('[PIX] Erro:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ message: 'Erro ao gerar PIX: ' + err.message }) };
  }
};
