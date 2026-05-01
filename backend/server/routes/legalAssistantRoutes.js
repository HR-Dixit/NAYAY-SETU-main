import { createLegalAssistantResponse } from "../services/legalAssistantService.js";

function cleanText(value, max = 1200) {
  return String(value || "").trim().slice(0, max);
}

export function registerLegalAssistantRoutes({
  app,
  apiKey,
  model,
  badRequest,
}) {
  app.post("/api/legal-assistant", async (req, res) => {
    const query = cleanText(req.body?.query, 1200);

    if (!query) {
      badRequest(res, "Query is required.");
      return;
    }

    try {
      const result = await createLegalAssistantResponse({
        query,
        apiKey,
        model,
      });

      res.json({
        ...result.data,
        mode: result.mode,
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (error) {
      res.status(500).json({
        error: String(error?.message || "Could not generate legal assistant response."),
      });
    }
  });
}
