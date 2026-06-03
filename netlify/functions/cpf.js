const https = require('https');

function requestGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, erro: 'Método não permitido.' }) };
  }

  const params = event.queryStringParameters || {};
  const cpfLimpo = (params.cpf || '').replace(/\D/g, '');

  if (cpfLimpo.length !== 11) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, erro: 'CPF inválido.' }) };
  }

  const token = process.env.CPF_API_TOKEN;
  if (!token) {
    return { statusCode: 502, headers, body: JSON.stringify({ success: false, erro: 'Token não configurado.' }) };
  }

  try {
    const url = `https://magmadatahub.com/api.php?token=${token}&cpf=${cpfLimpo}`;
    const result = await requestGet(url);

    console.log('[CPF] Status:', result.status, 'Body:', result.text.slice(0, 200));

    if (result.status < 200 || result.status >= 300) {
      return { statusCode: result.status, headers, body: JSON.stringify({ success: false, erro: 'Erro na base externa.' }) };
    }

    let data;
    try {
      data = JSON.parse(result.text);
    } catch (e) {
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, erro: 'Resposta inválida da API.' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    console.error('[CPF] Erro:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ success: false, erro: 'Erro ao consultar CPF: ' + err.message }) };
  }
};
