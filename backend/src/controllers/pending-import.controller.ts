import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error.js';
import { bulkPendingImports, ignorePendingImport, importPendingImport, listPendingImports, updatePendingImport } from '../services/pending-import.service.js';

export async function getPendingImports(_request: Request, response: Response): Promise<void> { response.json(await listPendingImports()); }
function idFrom(request: Request): string { const id = request.params.id; if (typeof id !== 'string') throw new AppError('Invalid review item ID.', 400); return id; }
export async function putPendingImport(request: Request, response: Response): Promise<void> { response.json({ item: await updatePendingImport(idFrom(request), request.body as Parameters<typeof updatePendingImport>[1]) }); }
export async function postImportPending(request: Request, response: Response): Promise<void> { response.json({ item: await importPendingImport(idFrom(request)) }); }
export async function postIgnorePending(request: Request, response: Response): Promise<void> { await ignorePendingImport(idFrom(request)); response.status(204).end(); }
export async function postBulkPending(request: Request, response: Response): Promise<void> {
  const body = request.body as { ids?: unknown; action?: unknown };
  const ids = Array.isArray(body.ids) && body.ids.every((id) => typeof id === 'string') ? body.ids : undefined;
  const action = body.action === 'ignore' ? 'ignore' : 'import';
  response.json(await bulkPendingImports(ids, action));
}
