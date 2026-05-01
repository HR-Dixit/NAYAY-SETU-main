import { listCommunityPosts } from "../models/nayaySetuMongo.js";
import { getCommunityData } from "../stores/communityStore.js";

function cleanText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function mapFallbackPosts(payload = {}) {
  const discussions = Array.isArray(payload.discussions) ? payload.discussions : [];
  return discussions.map((item) => ({
    _id: item.id,
    user_id: item.handle || item.author || "community-user",
    title: item.title,
    content: item.summary || item.response || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    upvotes: Number(item.votes || 0),
    createdAt: item.postedAt || "",
    comment_count: Array.isArray(item.comments) ? item.comments.length : 0,
    source: "file-fallback",
  }));
}

export function registerCommunityPostRoutes(app) {
  app.get("/api/community/posts", async (req, res) => {
    const search = cleanText(req.query?.search, 140);
    const tag = cleanText(req.query?.tag, 40);
    const page = cleanText(req.query?.page, 10);
    const limit = cleanText(req.query?.limit, 10);

    try {
      const result = await listCommunityPosts({
        search,
        tag,
        page,
        limit,
      });

      if (result.storeMode === "mongo") {
        res.json(result);
        return;
      }

      const fallback = await getCommunityData(search);
      const items = mapFallbackPosts(fallback).filter((item) =>
        tag ? item.tags.includes(tag) : true
      );

      res.json({
        items,
        total: items.length,
        page: 1,
        limit: items.length || 0,
        storeMode: result.storeMode,
      });
    } catch (error) {
      res.status(500).json({
        error: "Could not retrieve community posts.",
        detail: String(error?.message || "Unknown database error."),
      });
    }
  });
}
