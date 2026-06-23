import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { fail, ok } from './_shared';

export const CAREER_APPLICATIONS_BUCKET = 'career-applications';
export const MAX_CAREER_CV_BYTES = 5 * 1024 * 1024;

const ALLOWED_CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function cleanText(value = '', maxLength = 5000) {
  return String(value).trim().slice(0, maxLength);
}

function normalizeEmail(email = '') {
  return cleanText(email, 320).toLowerCase();
}

function sanitizeFileName(fileName = 'cv') {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'cv';
}

function inferCvMimeType(file) {
  if (file?.type && ALLOWED_CV_TYPES.has(file.type)) return file.type;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.doc')) return 'application/msword';
  return file?.type || '';
}

function validateCv(file) {
  if (!file) return fail('CV is required.', 'VALIDATION_ERROR');
  const mimeType = inferCvMimeType(file);
  if (file.size > MAX_CAREER_CV_BYTES) return fail('CV must be 5 MB or smaller.', 'FILE_TOO_LARGE');
  if (!ALLOWED_CV_TYPES.has(mimeType)) return fail('CV must be a PDF, DOC, or DOCX file.', 'FILE_TYPE_NOT_ALLOWED');
  return ok({
    name: file.name,
    type: mimeType,
    size: file.size,
  });
}

export async function submitCareerApplication(input = {}) {
  const role = cleanText(input.role || 'Open Application', 120);
  const desiredRole = cleanText(input.desiredRole || '', 160);
  const firstName = cleanText(input.firstName, 120);
  const lastName = cleanText(input.lastName, 120);
  const email = normalizeEmail(input.email);
  const portfolioUrl = cleanText(input.portfolioUrl || '', 500);
  const note = cleanText(input.note || '', 3000);
  const locale = input.locale === 'it' ? 'it' : 'en';
  const cv = input.cv;

  if (!role || !firstName || !lastName || !email) {
    return fail('Please complete the required fields.', 'VALIDATION_ERROR');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email.', 'VALIDATION_ERROR');
  }
  if (role === 'Open Application' && !desiredRole) {
    return fail('Tell us what you would like to do.', 'VALIDATION_ERROR');
  }

  const cvValidation = validateCv(cv);
  if (cvValidation.error) return cvValidation;
  const cvMimeType = cvValidation.data.type;

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const applicationId = crypto.randomUUID();
  const cvPath = `${applicationId}/${Date.now()}-${sanitizeFileName(cv.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(CAREER_APPLICATIONS_BUCKET)
    .upload(cvPath, cv, {
      cacheControl: '3600',
      contentType: cvMimeType,
      upsert: false,
    });

  if (uploadError) {
    return fail(uploadError.message || 'CV upload failed.', uploadError.code || 'CV_UPLOAD_FAILED');
  }

  const { error: insertError } = await supabase
    .from('career_applications')
    .insert([{
      id: applicationId,
      role,
      desired_role: desiredRole || null,
      first_name: firstName,
      last_name: lastName,
      email,
      portfolio_url: portfolioUrl || null,
      note: note || null,
      cv_bucket: CAREER_APPLICATIONS_BUCKET,
      cv_path: cvPath,
      cv_file_name: cv.name,
      cv_mime_type: cvMimeType,
      cv_size_bytes: cv.size,
      locale,
      source: 'careers',
      metadata: {
        page: 'careers',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    }]);

  if (insertError) {
    await supabase.storage.from(CAREER_APPLICATIONS_BUCKET).remove([cvPath]);
    return fail(insertError.message || 'Application submission failed.', insertError.code || 'CAREER_APPLICATION_FAILED');
  }

  return ok({
    id: applicationId,
    role,
    cvPath,
    status: 'submitted',
  });
}
