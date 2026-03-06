import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Denormalised collection kept in sync with Posts for efficient searching
export interface IPostSearch extends Document {
  postId: Types.ObjectId;
  titleLower: string; // lowercase title — used by the $text index
  owner: Types.ObjectId;
  createdAt: Date;
}

const postSearchSchema = new Schema<IPostSearch>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, unique: true, index: true },
    titleLower: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdAt: { type: Date, required: true, index: true },
  },
  { timestamps: false }
);

// Full-text index enables $text keyword search on titleLower
postSearchSchema.index({ titleLower: 'text' });

const PostSearch: Model<IPostSearch> = mongoose.model<IPostSearch>('PostSearch', postSearchSchema);
export default PostSearch;
