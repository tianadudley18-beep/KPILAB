module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileName, fileContent, context } = req.body;
  if (!fileContent) return res.status(400).json({ error: 'No file content' });

  const prompt = `Sos un analista de negocios experto. Analizá estos datos empresariales y devolvé SOLO un JSON válido (sin backticks, sin texto extra, sin explicaciones).

Archivo: ${fileName || 'datos.csv'}
Contexto: ${context || 'No especificado'}
Datos:
${fileContent.slice(0, 4000)}

Devolvé exactamente este JSON:
{
  "empresa_tipo": "descripción del tipo de empresa",
  "periodo": "período de los datos",
  "areas": [
    {
      "nombre": "nombre del área",
      "kpis": [
        { "nombre": "nombre KPI", "valor": "valor con unidad", "tendencia": "up|down|neutral", "cambio": "descripción del cambio" }
      ]
    }
  ],
  "hallazgos": [
    { "tipo": "good|warn|info", "texto": "hallazgo en 1 oración" }
  ],
  "recomendaciones": ["recomendación 1", "recomendación 2", "recomendación 3", "recomendación 4"],
  "chart_labels": ["label1","label2","label3","label4","label5","label6"],
  "chart_values": [100,200,300,400,500,600],
  "chart_titulo": "título del gráfico",
  "pie_labels": ["cat1","cat2","cat3","cat4"],
  "pie_values": [40,30,20,10]
}

Reglas:
- Detectá TODOS los KPIs posibles de los datos
- Organizalos por área (Ventas, Finanzas, RRHH, Operaciones, Marketing, Clientes, etc.)
- Los valores deben ser reales, sacados de los datos
- Mínimo 4 hallazgos y 4 recomendaciones
- SOLO el JSON, nada más`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', errText);
      return res.status(500).json({ error: 'Error de la API de IA: ' + errText });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error('JSON parse error:', clean);
      return res.status(500).json({ error: 'La IA devolvió un formato inesperado. Intentá de nuevo.' });
    }
    
    return res.status(200).json(parsed);

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ error: e.message });
  }
}
