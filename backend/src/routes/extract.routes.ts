import { Router } from 'express';
import { postExtract } from '../controllers/extract.controller.js';
import { imageUpload } from '../utils/upload.js';
import { asyncHandler } from '../utils/async-handler.js';

export const extractRouter = Router();

extractRouter.post('/', imageUpload.single('file'), asyncHandler(postExtract));
