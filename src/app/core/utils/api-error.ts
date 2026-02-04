export class ApiErrorMapper {
  static toMessage(
    e: any,
    t: (key: string) => string,
    fallbackKey = 'errors.API_REQUEST_FAILED'
  ): string {
    // Network / CORS / offline
    if (e?.status === 0) {
      return t('errors.API_NETWORK_ERROR');
    }

    const api = e?.error;

    // Multiple error codes (e.g. validation/business errors)
    if (Array.isArray(api?.errorCodes) && api.errorCodes.length > 0) {
      return api.errorCodes
        .map((code: string) => t(`errors.${code}`))
        .join('\n');
    }

    // Single error code
    if (typeof api?.code === 'string' && api.code) {
      return t(`errors.${api.code}`);
    }

    // Server error fallback (5xx)
    if (e?.status >= 500 && e?.status < 600) {
      return t('errors.API_SERVER_ERROR');
    }

    // Generic fallback
    return t(fallbackKey);
  }
}
