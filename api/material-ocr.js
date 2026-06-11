import { createClient } from '@supabase/supabase-js';

const DEFAULT_VISION_MODEL = 'gpt-4.1-mini';
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function getSupabaseUserClient(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publicKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publicKey || !token) return null;

  return createClient(supabaseUrl, publicKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeWhitespace(text = '') {
  return String(text)
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function toMaterial(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    chapterId: row.chapter_id,
    noteId: row.note_id,
    type: row.type,
    title: row.title,
    sourceUrl: row.source_url,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    processingStatus: row.processing_status || 'uploaded',
    extractedText: row.extracted_text || null,
    extractionError: row.extraction_error || null,
    processedAt: row.processed_at || null,
    pageCount: row.page_count ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function updateMaterial(client, materialId, userId, patch) {
  const { data, error } = await client
    .from('study_materials')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', materialId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function extractImageText({ imageDataUrl, mimeType }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      text: '',
      providerError: 'OCR provider is not configured.',
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || DEFAULT_VISION_MODEL,
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Extract all readable study text from this image.',
              'Preserve headings, bullet points, table-like rows, formulas, and line breaks when useful.',
              'Return only the extracted text in clean Markdown.',
              'If there is no readable text, return an empty string.',
            ].join(' '),
          },
          {
            type: 'input_image',
            image_url: imageDataUrl,
            detail: mimeType === 'image/png' ? 'high' : 'auto',
          },
        ],
      }],
      max_output_tokens: 2500,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      text: '',
      providerError: `OpenAI ${response.status}: ${errorText.slice(0, 300)}`,
    };
  }

  const data = await response.json();
  const text = data.output_text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((item) => item.text || '')
      .join('\n')
      .trim();

  const normalized = normalizeWhitespace(text);
  const noReadableText = /^(no readable text|no text|empty string|none)\.?$/i.test(normalized);

  return { text: noReadableText ? '' : normalized, providerError: null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  const token = getBearerToken(req);
  if (!token) {
    return json(res, 401, { error: { code: 'AUTH_REQUIRED', message: 'OCR requires an authenticated session.' } });
  }

  const client = getSupabaseUserClient(token);
  if (!client) {
    return json(res, 503, { error: { code: 'SUPABASE_CONFIG_MISSING', message: 'Supabase server config is missing.' } });
  }

  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData?.user?.id) {
    return json(res, 401, { error: { code: 'AUTH_REQUIRED', message: 'OCR requires a valid session.' } });
  }

  const body = getJsonBody(req);
  const materialId = String(body.materialId || '').trim();
  if (!materialId) {
    return json(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'materialId is required.' } });
  }

  const userId = authData.user.id;
  const { data: material, error: materialError } = await client
    .from('study_materials')
    .select('*')
    .eq('id', materialId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (materialError) {
    return json(res, 500, { error: { code: materialError.code || 'SUPABASE_ERROR', message: materialError.message } });
  }
  if (!material) {
    return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Material not found.' } });
  }

  const mimeType = material.mime_type || '';
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    return json(res, 400, { error: { code: 'UNSUPPORTED_FILE_TYPE', message: 'OCR supports PNG and JPEG files.' } });
  }
  if (!material.storage_path) {
    return json(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'Material has no storage path.' } });
  }
  if (Number(material.size_bytes || 0) > MAX_IMAGE_BYTES) {
    return json(res, 400, { error: { code: 'FILE_TOO_LARGE', message: 'Image must be 10 MB or smaller.' } });
  }

  try {
    await updateMaterial(client, materialId, userId, {
      processing_status: 'processing',
      extraction_error: null,
      processed_at: null,
    });

    const { data: fileData, error: downloadError } = await client.storage
      .from('study-materials')
      .download(material.storage_path);

    if (downloadError) throw downloadError;

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const { text, providerError } = await extractImageText({
      imageDataUrl: `data:${mimeType};base64,${base64}`,
      mimeType,
    });

    const now = new Date().toISOString();
    const nextPatch = text
      ? {
          processing_status: 'ready',
          extracted_text: text,
          extraction_error: null,
          processed_at: now,
          page_count: material.page_count ?? 1,
        }
      : {
          processing_status: 'unsupported',
          extracted_text: null,
          extraction_error: providerError || 'OCR found no readable text.',
          processed_at: now,
          page_count: material.page_count ?? 1,
        };

    const updated = await updateMaterial(client, materialId, userId, nextPatch);
    return json(res, 200, { data: { material: toMaterial(updated) }, error: null });
  } catch (error) {
    try {
      const updated = await updateMaterial(client, materialId, userId, {
        processing_status: 'failed',
        extracted_text: null,
        extraction_error: error?.message || 'OCR extraction failed.',
        processed_at: new Date().toISOString(),
      });
      return json(res, 200, { data: { material: toMaterial(updated) }, error: null });
    } catch (_) {
      return json(res, 500, {
        error: {
          code: error?.code || error?.name || 'OCR_FAILED',
          message: error?.message || 'OCR extraction failed.',
        },
      });
    }
  }
}
