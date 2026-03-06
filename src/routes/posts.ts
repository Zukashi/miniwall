import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import Post from '../models/Post';
import PostSearch from '../models/PostSearch';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { HTTP, LIMITS, PAGINATION } from '../config/constants';
import { ForbiddenError, NotFoundError, ConflictError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

const postBodyRules = [
  body('title').trim()
    .isLength({ min: LIMITS.POST_TITLE_MIN, max: LIMITS.POST_TITLE_MAX })
    .withMessage(`Title must be ${LIMITS.POST_TITLE_MIN}–${LIMITS.POST_TITLE_MAX} characters`),
  body('description').trim()
    .isLength({ min: LIMITS.POST_DESC_MIN, max: LIMITS.POST_DESC_MAX })
    .withMessage(`Description must be ${LIMITS.POST_DESC_MIN}–${LIMITS.POST_DESC_MAX} characters`),
];

const commentBodyRules = [
  body('text').trim()
    .isLength({ min: LIMITS.COMMENT_MIN, max: LIMITS.COMMENT_MAX })
    .withMessage(`Comment must be ${LIMITS.COMMENT_MIN}–${LIMITS.COMMENT_MAX} characters`),
];

const idParam = param('id').isMongoId().withMessage('Invalid post ID');
const commentIdParam = param('commentId').isMongoId().withMessage('Invalid comment ID');

// Throws 403 if the authenticated user is not the resource owner
function assertOwner(ownerId: mongoose.Types.ObjectId, userId: string): void {
  if (ownerId.toString() !== userId) throw new ForbiddenError('You do not own this resource');
}

// GET /api/posts — paginated list sorted by likes desc, then newest first
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.max(1, parseInt(req.query['limit'] as string) || PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    // Aggregation pipeline: compute likeCount, sort, join owner, then paginate
    const pipeline = [
      { $addFields: { likeCount: { $size: '$likes' } } },
      { $sort: { likeCount: -1, createdAt: -1 } as Record<string, 1 | -1> },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerData',
          pipeline: [{ $project: { username: 1 } }],
        },
      },
      { $unwind: '$ownerData' },
      { $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      }},
    ];

    const [result] = await Post.aggregate(pipeline);
    const posts = result.data as unknown[];
    const total = (result.total as Array<{ count: number }>)[0]?.count ?? 0;

    res.status(HTTP.OK).json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts — create a post and sync the search index
router.post('/', postBodyRules, validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, description } = req.body as { title: string; description: string };
      const post = await Post.create({ title, description, owner: req.user.id });

      // Keep denormalised PostSearch collection in sync for text search
      await PostSearch.create({
        postId: post._id,
        titleLower: title.toLowerCase(),
        owner: req.user.id,
        createdAt: post.createdAt,
      });

      res.status(HTTP.CREATED).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/posts/:id — single post with populated owner and comments
router.get('/:id', [idParam], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id'])
        .populate('owner', '-password')
        .populate('comments.user', '-password');
      if (!post) throw new NotFoundError('Post not found');
      res.status(HTTP.OK).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/posts/:id — update title/description (owner only); syncs search index
router.put('/:id', [idParam, ...postBodyRules], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id']);
      if (!post) throw new NotFoundError('Post not found');
      assertOwner(post.owner, req.user.id);

      const { title, description } = req.body as { title?: string; description?: string };
      if (title !== undefined) post.title = title;
      if (description !== undefined) post.description = description;
      await post.save();

      if (title !== undefined) {
        await PostSearch.updateOne({ postId: post._id }, { titleLower: title.toLowerCase() });
      }

      res.status(HTTP.OK).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/posts/:id — remove post and its search record (owner only)
router.delete('/:id', [idParam], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id']);
      if (!post) throw new NotFoundError('Post not found');
      assertOwner(post.owner, req.user.id);
      await post.deleteOne();
      await PostSearch.deleteOne({ postId: post._id });
      res.status(HTTP.OK).json({ success: true, message: 'Post deleted' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/posts/:id/comments — all comments with commenter username
router.get('/:id/comments', [idParam], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id']).populate('comments.user', 'username');
      if (!post) throw new NotFoundError('Post not found');
      res.status(HTTP.OK).json({ success: true, data: post.comments });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/posts/:id/comment — add comment; owner cannot comment their own post
router.post('/:id/comment', [idParam, ...commentBodyRules], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id']);
      if (!post) throw new NotFoundError('Post not found');

      if (post.owner.toString() === req.user.id) {
        throw new ForbiddenError('You cannot comment on your own post');
      }

      post.comments.push({ user: new mongoose.Types.ObjectId(req.user.id), text: (req.body as { text: string }).text });
      await post.save();

      res.status(HTTP.CREATED).json({ success: true, data: post.comments[post.comments.length - 1] });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/posts/:id/comment/:commentId — remove own comment
router.delete('/:id/comment/:commentId', [idParam, commentIdParam], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id']);
      if (!post) throw new NotFoundError('Post not found');

      const comment = post.comments.id(req.params['commentId']);
      if (!comment) throw new NotFoundError('Comment not found');
      if (comment.user.toString() !== req.user.id) throw new ForbiddenError('You can only delete your own comments');

      comment.deleteOne();
      await post.save();
      res.status(HTTP.OK).json({ success: true, message: 'Comment deleted' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/posts/:id/like — like a post; owner and duplicate likes are blocked
router.post('/:id/like', [idParam], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id']);
      if (!post) throw new NotFoundError('Post not found');

      if (post.owner.toString() === req.user.id) throw new ForbiddenError('You cannot like your own post');
      if (post.likes.some((l) => l.user.toString() === req.user.id)) throw new ConflictError('You have already liked this post');

      post.likes.push({ user: new mongoose.Types.ObjectId(req.user.id) } as never);
      await post.save();
      res.status(HTTP.CREATED).json({ success: true, data: { likeCount: post.likes.length } });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/posts/:id/like — remove the authenticated user's like
router.delete('/:id/like', [idParam], validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await Post.findById(req.params['id']);
      if (!post) throw new NotFoundError('Post not found');

      const likeIndex = post.likes.findIndex((l) => l.user.toString() === req.user.id);
      if (likeIndex === -1) throw new ConflictError('You have not liked this post');

      post.likes.splice(likeIndex, 1);
      await post.save();
      res.status(HTTP.OK).json({ success: true, data: { likeCount: post.likes.length } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
