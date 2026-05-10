import { Router } from "express";
import { getAPIKey } from "../auth.js";
import { chirpyConfig } from "../config.js";
import { updateUserChirpyRedStatus } from "../lib/db/queries/users.js";

const router = Router();

interface WebhookEvent {
  event: string;
  data?: {
    userId?: string;
    chirpId?: string;
    commentId?: string;
    followerId?: string;
    followingId?: string;
  };
}

const eventHandlers: Record<string, (data: WebhookEvent["data"]) => void | Promise<void>> = {
  "user.upgraded": async (data) => {
    const userId = data?.userId;
    if (!userId) throw new Error("Missing userId");
    await updateUserChirpyRedStatus(userId, true);
  },
  "chirp.created": (data) => {
    console.log("Webhook: New chirp created", data?.chirpId);
  },
  "chirp.deleted": (data) => {
    console.log("Webhook: Chirp deleted", data?.chirpId);
  },
  "user.followed": (data) => {
    console.log("Webhook: User followed", data?.followerId, "followed", data?.followingId);
  },
  "user.unfollowed": (data) => {
    console.log("Webhook: User unfollowed", data?.followerId, "unfollowed", data?.followingId);
  },
  "chirp.liked": (data) => {
    console.log("Webhook: Chirp liked", data?.chirpId, "by user", data?.userId);
  },
  "chirp.unliked": (data) => {
    console.log("Webhook: Chirp unliked", data?.chirpId, "by user", data?.userId);
  }
};

router.post("/", async (req, res) => {
  let polkaKey: string;
  try {
    polkaKey = getAPIKey(req);
  } catch {
    return res.status(401).json({ message: "Invalid API key" });
  }
  if (polkaKey !== chirpyConfig.apiConfig.polkaKey) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  const { event, data } = req.body as WebhookEvent;

  if (!event) {
    return res.status(400).json({ message: "Invalid event" });
  }

  const handler = eventHandlers[event];

  if (!handler) {
    return res.status(204).json({ message: "Event ignored" });
  }

  try {
    await handler(data);
    return res.status(204).json({ message: "Event processed" });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ message: "Failed to process event" });
  }
});

export default router;
