import { readFile, unlink } from 'node:fs/promises';
import type { Request, Response } from 'express';
import { extractDocument, type ExtractedItem } from '../services/extraction.service.js';
import { AppError } from '../utils/app-error.js';
import { assertSupportedImageContents } from '../utils/upload.js';

function getPastedText(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const text = (body as Record<string, unknown>).text;
  if (typeof text !== 'string' || text.trim().length === 0) return null;
  return text.trim();
}

export async function postExtract(request: Request, response: Response): Promise<void> {
  const uploadedFile = request.file;
  const text = getPastedText(request.body);
  if (!uploadedFile && !text) throw new AppError('Provide a PNG/JPG image file or pasted email text.', 400);
  if (uploadedFile && text) throw new AppError('Provide either an image file or pasted email text, not both.', 400);

  try {
    let extracted: ExtractedItem;
    if (uploadedFile) {
      const imageContents = await readFile(uploadedFile.path);
      assertSupportedImageContents(imageContents);
      extracted = await extractDocument({
        kind: 'image',
        dataUrl: `data:${uploadedFile.mimetype};base64,${imageContents.toString('base64')}`,
      });
    } else {
      extracted = await extractDocument({ kind: 'text', text: text! });
    }

    response.json({
      success: true,
      extraction: {
        merchant: extracted.merchant,
        subscription: extracted.subscription,
        amount: extracted.amount,
        currency: extracted.currency,
        frequency: extracted.frequency,
        renewalDate: extracted.renewalDate,
        cancelBefore: extracted.cancelBefore,
      },
      item: extracted,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Never log document contents or API credentials.
    response.status(502).json({ success: false, message: 'Could not extract information. Please enter manually.' });
  } finally {
    if (uploadedFile) await unlink(uploadedFile.path).catch(() => undefined);
  }
}
