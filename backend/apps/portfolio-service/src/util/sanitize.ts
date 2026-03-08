import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window as unknown as Window);

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input);
}
