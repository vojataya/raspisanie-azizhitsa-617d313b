// Исходные hash и query адреса на момент загрузки страницы.
// supabase-js при создании клиента сам разбирает ссылку из письма (access_token в hash)
// и очищает hash, поэтому модуль импортируется в main.tsx первой строкой — раньше App
// и клиента Supabase.

export interface InitialUrl {
  hash: string;
  search: string;
}

const EMPTY: InitialUrl = { hash: '', search: '' };

let captured: InitialUrl =
  typeof window === 'undefined'
    ? EMPTY
    : { hash: window.location.hash, search: window.location.search };

/**
 * Отдаёт исходные hash и query один раз за загрузку страницы.
 * Повторный вызов (например, при переходе на страницу внутри приложения) вернёт пустые строки,
 * чтобы ссылку из письма не обработать второй раз.
 */
export function consumeInitialUrl(): InitialUrl {
  const value = captured;
  captured = EMPTY;
  return value;
}
