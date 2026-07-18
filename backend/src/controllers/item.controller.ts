import type { Request, Response } from 'express';
import * as itemService from '../services/item.service.js';
import { generateEmailDraft } from '../services/email.service.js';
import { AppError } from '../utils/app-error.js';
import {
  validateCreateItem,
  validateItemId,
  validateSort,
  validateUpdateItem,
} from '../utils/item-validation.js';

export async function getItems(request: Request, response: Response): Promise<void> {
  const { field, order } = validateSort(request.query);
  const items = await itemService.listItems(field, order);
  response.json({ items });
}

export async function getUpcomingItems(_request: Request, response: Response): Promise<void> {
  const items = await itemService.getUpcomingDeadlines();
  response.json({ items });
}

export async function postItem(request: Request, response: Response): Promise<void> {
  const item = await itemService.createItem(validateCreateItem(request.body));
  response.status(201).json({ item });
}

export async function putItem(request: Request, response: Response): Promise<void> {
  const id = validateItemId(request.params.id);
  const item = await itemService.updateItem(id, validateUpdateItem(request.body));
  response.json({ item });
}

export async function removeItem(request: Request, response: Response): Promise<void> {
  const id = validateItemId(request.params.id);
  await itemService.deleteItem(id);
  response.status(204).send();
}

export async function postDraftEmail(request: Request, response: Response): Promise<void> {
  const id = validateItemId(request.params.id);
  const item = await itemService.findItemById(id);
  if (!item) throw new AppError('Item not found.', 404);

  try {
    const email = await generateEmailDraft(item);
    response.json({ email });
  } catch {
    // Do not expose provider, timeout, model, or credential details to the client.
    response.status(502).json({ success: false, message: 'Unable to generate email.' });
  }
}
