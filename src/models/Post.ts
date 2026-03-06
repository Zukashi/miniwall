import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ILike {
  _id: Types.ObjectId;
  user: Types.ObjectId;
}

export interface IComment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IPost extends Document {
  title: string;
  description: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  likes: Types.DocumentArray<ILike>;
  comments: Types.DocumentArray<IComment>;
  likeCount: number; // virtual — computed from likes.length, not stored in DB
}

const likeSchema = new Schema<ILike>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true } },
  { _id: true }
);

const commentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, minlength: 1, maxlength: 500, trim: true },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { _id: true }
);

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    likes: [likeSchema],
    comments: [commentSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

postSchema.virtual('likeCount').get(function (this: IPost) {
  return this.likes.length;
});

postSchema.index({ createdAt: -1 });

const Post: Model<IPost> = mongoose.model<IPost>('Post', postSchema);
export default Post;
