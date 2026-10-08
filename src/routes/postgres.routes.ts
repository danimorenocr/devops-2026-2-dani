import { Router, type Request, type Response } from "express";
import { pgPool } from "../db/postgres.js";
import { UserService } from "../services/user.service.js";

export const postgresRouter = Router();

postgresRouter.get("/health", async (_req: Request, res: Response) => {
  try {
    const result = await pgPool.query("SELECT NOW() AS now");
    res.json({
      status: "ok",
      database: "postgresql",
      serverTime: result.rows[0].now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(503).json({
      status: "error",
      database: "postgresql",
      message,
    });
  }
});

postgresRouter.get("/users", async (_req: Request, res: Response) => {
  try {
    const users = await UserService.getPostgresUsers();

    res.json({
      database: "postgresql",
      count: users.length,
      data: users,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      status: "error",
      database: "postgresql",
      message,
    });
  }
});

postgresRouter.post("/users", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };

    const validation = UserService.validate({ name, email });
    if (!validation.isValid) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const user = await UserService.createPostgresUser(name!, email!);

    res.status(201).json({
      database: "postgresql",
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      status: "error",
      database: "postgresql",
      message,
    });
  }
});
