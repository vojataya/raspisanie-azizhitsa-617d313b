// Разбор ссылки восстановления пароля и ошибок Supabase Auth — чистые функции, покрыты тестами.

export type RecoveryLink =
  /** Наш вид: /reset-password?token_hash=...&type=recovery — токен подтверждаем через verifyOtp. */
  | { kind: 'token_hash'; tokenHash: string }
  /** Стандартный вид Supabase: #access_token=...&type=recovery — сессию создаёт сам supabase-js. */
  | { kind: 'implicit' }
  /** В адресе есть error / error_code (например, otp_expired). */
  | { kind: 'error'; errorCode: string | null; errorDescription: string | null }
  /** Параметров ссылки нет. */
  | { kind: 'none' };

function toParams(value: string, prefix: '#' | '?'): URLSearchParams {
  return new URLSearchParams(value.startsWith(prefix) ? value.slice(1) : value);
}

export function parseRecoveryLink(hash: string, search: string): RecoveryLink {
  const hashParams = toParams(hash ?? '', '#');
  const queryParams = toParams(search ?? '', '?');

  const pick = (name: string) => hashParams.get(name) || queryParams.get(name) || null;

  const error = pick('error');
  const errorCode = pick('error_code');
  if (error || errorCode) {
    return {
      kind: 'error',
      errorCode: errorCode ?? error,
      errorDescription: pick('error_description'),
    };
  }

  const tokenHash = queryParams.get('token_hash');
  if (tokenHash && queryParams.get('type') === 'recovery') {
    return { kind: 'token_hash', tokenHash };
  }

  if (hashParams.get('access_token') && hashParams.get('type') === 'recovery') {
    return { kind: 'implicit' };
  }

  return { kind: 'none' };
}

/** Ошибка ограничения частоты отправки писем (HTTP 429, over_email_send_rate_limit). */
export function isEmailRateLimitError(
  error: { status?: number; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return error.status === 429 || error.code === 'over_email_send_rate_limit';
}
