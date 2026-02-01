export class ApiErrorMapper {
  static toMessage(e: any, fallback = 'Request failed.'): string {
    if (e?.status >= 500 && e?.status < 600) {
      return 'Something went wrong. Please try again.';
    }

    const errs = e?.error?.errors;
    if (Array.isArray(errs) && errs.length > 0) {
      return errs.join('\n');
    }

    if (e?.error?.debugMessage) {
      return e.error.debugMessage;
    }

    return fallback;
  }
}
