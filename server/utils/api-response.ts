export function ok<T>(data: T) {
  return {
    success: true,
    data,
  };
}

export function fail(message: string, errors?: unknown) {
  return {
    success: false,
    message,
    errors,
  };
}
