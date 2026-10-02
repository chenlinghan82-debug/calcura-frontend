import { CalculationError, explainExpression, needsAns } from './_parser.js'

const BACKEND = 'https://calcura-backend.vercel.app'

function json(payload, status, extraHeaders) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      ...(extraHeaders || {}),
    },
  })
}

async function readBody(request) {
  const text = await request.text()
  if (!text.trim()) return {}
  return JSON.parse(text)
}

export const config = { runtime: 'edge' }

export default async function handler(request) {
  const started = Date.now()
  const timing = () => ({ 'x-calc-ms': String(Date.now() - started) })
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type',
        'access-control-max-age': '86400',
      },
    })
  }
  if (request.method !== 'POST') {
    return json({ detail: { success: false, message: 'Method not allowed' } }, 405, timing())
  }

  let body
  try {
    body = await readBody(request)
  } catch {
    return json({ detail: { success: false, message: 'Request body must be JSON' } }, 422, timing())
  }
  const expression = typeof body?.expression === 'string' ? body.expression : ''
  if (!expression.trim()) {
    return json({ detail: { success: false, message: 'Expression cannot be empty' } }, 422, timing())
  }

  if (needsAns(expression)) {
    const forwarded = await fetch(BACKEND + '/api/preview', {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ expression }),
    })
    const text = await forwarded.text()
    return new Response(text, {
      status: forwarded.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
        'x-calc-ms': String(Date.now() - started),
      },
    })
  }

  try {
    const explained = explainExpression(expression, null)
    return json({
      success: true,
      expression,
      result: explained.result,
      steps: explained.steps,
      saved: false,
    }, 200, timing())
  } catch (error) {
    const message = error instanceof CalculationError ? error.message : 'The calculation could not be completed.'
    return json({ detail: { success: false, message } }, 400, timing())
  }
}
