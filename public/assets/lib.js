/**
 * Librería de funciones auxiliares para JARVIS (ESM)
 */

export function extractReply(data) {
  if (!data) throw new Error('No hay datos');
  
  // Soporte para formato OpenAI
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const content = data.choices[0].message.content;
    if (data._degraded) {
      console.warn('Respuesta degradada detectada');
    }
    return content;
  }
  
  // Soporte para formato directo { reply } o { response }
  if (data.reply) return data.reply;
  if (data.response) return data.response;
  
  throw new Error('Formato de respuesta inválido');
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
