export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  const entries = params ? Object.entries(params) : [];

  if (entries.length === 0) {
    return `${baseUrl}${path}`;
  }

  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const separator = path.includes('?') ? '&' : '?';

  return `${baseUrl}${path}${separator}${query}`;
}

async function handleErrorResponse(response: Response): Promise<never> {
  const body: unknown = await response.json().catch(() => undefined);
  const code = isErrorEnvelope(body) ? body.error?.code : undefined;
  const message = isErrorEnvelope(body) ? body.error?.message : undefined;

  throw new ApiError(
    message ?? `Requisição falhou com status ${response.status}`,
    response.status,
    code,
  );
}

export async function apiGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const response = await fetch(buildUrl(path, params));

  if (!response.ok) {
    return handleErrorResponse(response);
  }

  return response.json();
}

export async function apiPost(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });

  if (!response.ok) {
    return handleErrorResponse(response);
  }

  return response.json();
}

export async function apiPatch(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(buildUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return handleErrorResponse(response);
  }

  return response.json();
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(buildUrl(path), { method: 'DELETE' });

  if (!response.ok) {
    return handleErrorResponse(response);
  }
}
