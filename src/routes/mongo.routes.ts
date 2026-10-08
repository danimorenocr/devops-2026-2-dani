import { Router, type Request, type Response } from "express";
import { getMongoDb } from "../db/mongo.js";
import { UserService } from "../services/user.service.js";

export const mongoRouter = Router();

mongoRouter.get("/health", async (_req: Request, res: Response) => {
  try {
    const db = getMongoDb();
    const ping = await db.command({ ping: 1 });
    res.json({
      status: "ok",
      database: "mongodb",
      ping,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(503).json({
      status: "error",
      database: "mongodb",
      message,
    });
  }
});

mongoRouter.get("/users", async (_req: Request, res: Response) => {
  try {
    const users = await UserService.getMongoUsers();

    res.json({
      database: "mongodb",
      count: users.length,
      data: users,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      status: "error",
      database: "mongodb",
      message,
    });
  }
});

mongoRouter.post("/users", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };

    const validation = UserService.validate({ name, email });
    if (!validation.isValid) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const user = await UserService.createMongoUser(name!, email!);

    res.status(201).json({
      database: "mongodb",
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      status: "error",
      database: "mongodb",
      message,
    });
  }
});
