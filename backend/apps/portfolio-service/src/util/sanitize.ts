import * as createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
const factory = typeof (createDOMPurify as any).default === 'function'
  ? (createDOMPurify as any).default
  : createDOMPurify;
const DOMPurify = (factory as any)(window as any);

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input);
}
