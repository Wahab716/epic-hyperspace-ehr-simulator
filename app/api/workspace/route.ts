import { getWorkspaceStore } from '../../../lib/workspace/store.mjs';
import { createWorkspaceHandlers } from '../../../lib/workspace/service.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return createWorkspaceHandlers(getWorkspaceStore()).GET(request);
}
export async function POST(request: Request) {
  return createWorkspaceHandlers(getWorkspaceStore()).POST(request);
}
