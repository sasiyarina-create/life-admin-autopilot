import { Router } from 'express';
import { getItems, getUpcomingItems, postDraftEmail, postItem, putItem, removeItem } from '../controllers/item.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const itemRouter = Router();

itemRouter.get('/', asyncHandler(getItems));
itemRouter.get('/upcoming', asyncHandler(getUpcomingItems));
itemRouter.post('/', asyncHandler(postItem));
itemRouter.post('/:id/draft-email', asyncHandler(postDraftEmail));
itemRouter.put('/:id', asyncHandler(putItem));
itemRouter.delete('/:id', asyncHandler(removeItem));
