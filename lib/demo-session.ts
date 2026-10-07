// A local UI tour, not an authentication mechanism. No demo JWTs are created.
import snapshot from './demo-snapshot.json';
export const demoRoles = ['BENEFICIARY', 'FIELD_WORKER', 'FACILITATOR', 'DISTRICT_OFFICER', 'ADMIN'] as const;
export type DemoRole = typeof demoRoles[number];
const KEY = 'leap_readonly_demo_role';
export function demoRole(): DemoRole | null {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(KEY);
  return demoRoles.includes(value as DemoRole) ? value as DemoRole : null;
}
export function startDemo(role: DemoRole) { window.sessionStorage.setItem(KEY, role); }
export function endDemo() { if (typeof window !== 'undefined') window.sessionStorage.removeItem(KEY); }
export const demoHome: Record<DemoRole, string> = { BENEFICIARY: '/', FIELD_WORKER: '/field-worker', FACILITATOR: '/review', DISTRICT_OFFICER: '/officer', ADMIN: '/admin' };
export class DemoRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
// Closed routing: an unavailable snapshot or mutation must NEVER fall through to the live API.
export function demoResponse(role: DemoRole, path: string, method = 'GET'): unknown {
  if (method.toUpperCase() !== 'GET') throw new DemoRequestError('This demo is read-only. No changes were saved. Exit demo and sign in to use live workflows.', 403);
  if (path === '/api/auth/me') return { id: -1, email: 'read-only-demo@example.invalid', role };
  if (path === '/api/interviews/assistance/config') return { enabled: false };
  if (path === '/api/auth/demo-config') return { enabled: false, roles: {} };
  const url = new URL(path, 'https://demo.invalid');
  const route = url.pathname;
  const forbidden = (route.startsWith('/api/admin/') && role !== 'ADMIN')
    || (route.startsWith('/api/dashboard/') && !['ADMIN', 'DISTRICT_OFFICER'].includes(role))
    || (route.startsWith('/api/reviews') && !['ADMIN', 'FACILITATOR'].includes(role))
    || (route.startsWith('/api/field-worker/') && !['ADMIN', 'FIELD_WORKER'].includes(role))
    || (role === 'DISTRICT_OFFICER' && !route.startsWith('/api/dashboard/'));
  if (forbidden) throw new DemoRequestError('This screen belongs to a different demo role.', 403);
  const responses: Record<string, unknown> = snapshot.responses;
  if (route === '/api/reviews') {
    const queue = responses['/api/reviews?page=1'] as { items: Array<{status: string}> };
    const items = queue.items.filter(item => !url.searchParams.get('status') || item.status === url.searchParams.get('status'));
    return { items: Number(url.searchParams.get('page') || 1) === 1 ? items : [], total: items.length };
  }
  if (route === '/api/field-worker/beneficiaries') return Number(url.searchParams.get('page') || 1) === 1 ? structuredClone(responses['/api/field-worker/beneficiaries?page=1']) : [];
  if (!(route in responses)) throw new DemoRequestError('No sample record is available here. This read-only demo does not contact the live service.', 404);
  return structuredClone(responses[route]);
}
