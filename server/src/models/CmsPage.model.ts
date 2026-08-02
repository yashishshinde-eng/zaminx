import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * CMS page with structured content blocks (no raw HTML). Content shape is
 * validated by the shared `cmsPageSchema` Zod contract on write; the model
 * stores blocks as a flexible array so the block vocabulary can grow.
 */
const cmsPageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    blocks: { type: [Schema.Types.Mixed], default: [] },
    seo: {
      title: { type: String, trim: true, maxlength: 200 },
      description: { type: String, trim: true, maxlength: 300 },
    },
    status: { type: String, enum: ["published", "draft"], default: "draft", index: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Used for fast published-page lookups by slug.
cmsPageSchema.index({ status: 1, slug: 1 });

export type CmsPageDocument = InferSchemaType<typeof cmsPageSchema> & mongoose.Document;
export const CmsPage = mongoose.model<CmsPageDocument, Model<CmsPageDocument>>("CmsPage", cmsPageSchema);