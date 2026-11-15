/**
 * Librería de funciones auxiliares para JARVIS (ESM)
 */

export function extractReply(data) {
  if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Formato de respuesta inválido');
  }
  const content = data.choices[0].message.content;
  if (data._degraded) console.warn('Respuesta degradada');
  return content;
}

export function getDiskPct(free, total) {
    if (total === 0) return 0;
    return 100 * (1 - (free / total));
}

export function percentil10(arr) {
    if (arr.length === 0) return -Infinity;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.1)];
}

export function trimHistory(messages, limit = 12) {
  if (!Array.isArray(messages)) return [];
  if (messages.length <= limit) return messages;
  
  const systemMessage = messages.find(m => m.role === 'system');
  const recentMessages = messages.slice(-limit);
  
  if (systemMessage && !recentMessages.includes(systemMessage)) {
    return [systemMessage, ...recentMessages];
  }
  
  return recentMessages;
}

export function rmsToDbfs(float32Array) {
  let sumSquares = 0;
  for (let i = 0; i < float32Array.length; i++) {
    sumSquares += float32Array[i] * float32Array[i];
  }
  const rms = Math.sqrt(sumSquares / float32Array.length);
  const dbfs = 20 * Math.log10(rms);
  return isFinite(dbfs) ? dbfs : -Infinity;
}

export function bytesToGB(n) {
  if (typeof n !== 'number' || isNaN(n)) return 0;
  return n / (1024 ** 3);
}

export function pct(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  return n.toFixed(1);
}
