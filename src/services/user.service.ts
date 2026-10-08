import { pgPool } from "../db/postgres.js";
import { getMongoDb } from "../db/mongo.js";

export interface UserInput {
  name?: string;
  email?: string;
}

export interface PostgresUser {
  id: number;
  name: string;
  email: string;
  created_at: string | Date;
}

export interface MongoUser {
  _id?: unknown;
  name: string;
  email: string;
  createdAt: Date;
}

export class UserService {
  static validate(input: UserInput): { isValid: boolean; error?: string } {
    if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
      return { isValid: false, error: "name and email are required" };
    }
    if (!input.email || typeof input.email !== "string" || !input.email.trim()) {
      return { isValid: false, error: "name and email are required" };
    }
    return { isValid: true };
  }

  static async getPostgresUsers(): Promise<PostgresUser[]> {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await pgPool.query(
      "SELECT id, name, email, created_at FROM users ORDER BY id ASC"
    );

    return (result.rows ?? []) as PostgresUser[];
  }

  static async createPostgresUser(name: string, email: string): Promise<PostgresUser> {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await pgPool.query(
      `INSERT INTO users (name, email)
       VALUES ($1, $2)
       RETURNING id, name, email, created_at`,
      [name, email]
    );

    return result.rows[0] as PostgresUser;
  }

  static async getMongoUsers(): Promise<MongoUser[]> {
    const db = getMongoDb();
    const users = await db
      .collection("users")
      .find({})
      .project({ name: 1, email: 1, createdAt: 1 })
      .toArray();

    return users as unknown as MongoUser[];
  }

  static async createMongoUser(name: string, email: string): Promise<MongoUser> {
    const db = getMongoDb();
    const doc = {
      name,
      email,
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(doc);

    return {
      _id: result.insertedId,
      ...doc,
    };
  }
}
