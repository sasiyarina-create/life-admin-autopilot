import { Router } from 'express';
import { getItems, getUpcomingItems, postItem, putItem, removeItem } from '../controllers/item.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const itemRouter = Router();

itemRouter.get('/', asyncHandler(getItems));
itemRouter.get('/upcoming', asyncHandler(getUpcomingItems));
itemRouter.post('/', asyncHandler(postItem));
itemRouter.put('/:id', asyncHandler(putItem));
itemRouter.delete('/:id', asyncHandler(removeItem));
