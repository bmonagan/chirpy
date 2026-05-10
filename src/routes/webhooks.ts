import { Router } from "express";
import { getAPIKey } from "../auth.js";
import { chirpyConfig } from "../config.js";
import { updateUserChirpyRedStatus } from "../lib/db/queries/users.js";

const router = Router();

router.post("/", (req, res) => {
  let polkaKey: string;
  try {
    polkaKey = getAPIKey(req);
  } catch {
    return res.status(401).json({ message: "Invalid API key" });
  }
  if (polkaKey !== chirpyConfig.apiConfig.polkaKey) {
    return res.status(401).json({ message: "Invalid API key" });
  }
  if (!req.body.event) {
    return res.status(400).json({ message: "Invalid event" });
  }
  if (req.body.event != "user.upgraded") {
    return res.status(204).json({ message: "Event ignored" });
  }
  const userId = req.body.data?.userId;
  if (!userId) {
    return res.status(404).json({ message: "Invalid event data: missing userId" });
  }

  updateUserChirpyRedStatus(userId, true).catch(err => {
    return res.status(404).json({ message: "Failed to update user chirpy red status" });
  });
  return res.status(204).json({ message: "Chirpy red status updated" });
});

export default router;
