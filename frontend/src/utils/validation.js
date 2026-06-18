// 🔴 ABSOLUTE — trim all inputs before use in API calls or comparisons
export const clean = (val) => (val || '').trim();

export const isEmail = (val) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(val));

export const isRequired = (val) =>
  clean(val).length > 0;

export const minLength = (val, n) =>
  clean(val).length >= n;

export const noWhitespace = (val) =>
  /^\S+$/.test(clean(val));

export const extractApiError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || 'An unexpected error occurred';
  return data?.error?.message || data?.message || 'An unexpected error occurred';
};
