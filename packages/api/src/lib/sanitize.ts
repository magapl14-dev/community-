import sanitizeHtml from 'sanitize-html'

const STRIP_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
}

export function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null
  return sanitizeHtml(input, STRIP_OPTIONS).trim() || null
}
