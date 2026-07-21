import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPendingImports, postBulkPending, postIgnorePending, postImportPending, putPendingImport } from '../controllers/pending-import.controller.js';

export const pendingImportRouter = Router();
pendingImportRouter.get('/', asyncHandler(getPendingImports));
pendingImportRouter.post('/bulk', asyncHandler(postBulkPending));
pendingImportRouter.put('/:id', asyncHandler(putPendingImport));
pendingImportRouter.post('/:id/import', asyncHandler(postImportPending));
pendingImportRouter.post('/:id/ignore', asyncHandler(postIgnorePending));
