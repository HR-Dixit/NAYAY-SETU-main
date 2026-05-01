import { findLawyers } from "../models/nayaySetuMongo.js";

function cleanText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

export function registerLawyerRoutes(app) {
  app.get("/api/lawyers", async (req, res) => {
    try {
      const result = await findLawyers({
        search: cleanText(req.query?.search, 140),
        specialization: cleanText(req.query?.specialization, 120),
        location: cleanText(req.query?.location, 120),
        language: cleanText(req.query?.language, 40),
        availability_status: cleanText(req.query?.availability_status, 20),
        verified: cleanText(req.query?.verified, 10),
        min_rating: cleanText(req.query?.min_rating, 10),
        min_experience: cleanText(req.query?.min_experience, 10),
        sort_by: cleanText(req.query?.sort_by, 20),
        page: cleanText(req.query?.page, 10),
        limit: cleanText(req.query?.limit, 10),
      });

      res.json({
        filters: {
          search: cleanText(req.query?.search, 140),
          specialization: cleanText(req.query?.specialization, 120),
          location: cleanText(req.query?.location, 120),
          language: cleanText(req.query?.language, 40),
          availability_status: cleanText(req.query?.availability_status, 20),
          verified: cleanText(req.query?.verified, 10),
          min_rating: cleanText(req.query?.min_rating, 10),
          min_experience: cleanText(req.query?.min_experience, 10),
          sort_by: cleanText(req.query?.sort_by, 20),
        },
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        error: "Could not retrieve lawyers.",
        detail: String(error?.message || "Unknown database error."),
      });
    }
  });
}
