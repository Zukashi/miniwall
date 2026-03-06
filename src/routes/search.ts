import { Router, Request, Response, NextFunction } from 'express';
import { query } from 'express-validator';
import User from '../models/User';
import Post from '../models/Post';
import PostSearch from '../models/PostSearch';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { HTTP } from '../config/constants';
import { NotFoundError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

const router = Router();

router.use(authenticate);

const searchRules = [
  query('title').optional().trim().notEmpty().withMessage('title must not be blank if provided'),
  query('owner').optional().trim().notEmpty().withMessage('owner must not be blank if provided'),
  query('from').optional().isISO8601().withMessage('from must be a valid ISO 8601 date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO 8601 date'),
];

/**
 * GET /api/search
 * Searches posts by title keyword, owner username, and/or date range.
 * At least one query parameter must be supplied.
 *
 * @query title - Full-text keyword search on post titles
 * @query owner - Filter by owner's username
 * @query from  - ISO 8601 date: posts created on or after this date
 * @query to    - ISO 8601 date: posts created on or before this date
 * @returns 200 { success, data: posts[] } | 400 | 404
 */
router.get(
  '/',
  searchRules,
  validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, owner, from, to } = req.query as {
        title?: string;
        owner?: string;
        from?: string;
        to?: string;
      };

      if (!title && !owner && !from && !to) {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: 'Provide at least one search parameter: title, owner, from, to',
        });
        return;
      }

      // Build the PostSearch filter incrementally
      const filter: Record<string, unknown> = {};

      if (title) {
        filter['$text'] = { $search: title };
      }

      if (owner) {
        // Accept either a username or a raw ObjectId
        let ownerObjectId: mongoose.Types.ObjectId | undefined;

        if (mongoose.Types.ObjectId.isValid(owner)) {
          ownerObjectId = new mongoose.Types.ObjectId(owner);
        } else {
          const userDoc = await User.findOne({ username: owner });
          if (!userDoc) throw new NotFoundError(`User "${owner}" not found`);
          ownerObjectId = userDoc._id as mongoose.Types.ObjectId;
        }
        filter['owner'] = ownerObjectId;
      }

      if (from || to) {
        const dateFilter: Record<string, Date> = {};
        if (from) dateFilter['$gte'] = new Date(from);
        if (to) dateFilter['$lte'] = new Date(to);
        filter['createdAt'] = dateFilter;
      }

      const searchResults = await PostSearch.find(filter).select('postId').lean();
      const postIds = searchResults.map((r) => r.postId);

      const posts = await Post.find({ _id: { $in: postIds } })
        .populate('owner', '-password')
        .sort({ createdAt: -1 });

      res.status(HTTP.OK).json({ success: true, data: posts });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
