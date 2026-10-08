import { describe, it, expect, vi, beforeEach } from "vitest";

const { pgQuery, mongoInsertOne, mongoToArray, mongoProject, mongoFind } = vi.hoisted(() => {
  const toArray = vi.fn();
  const project = vi.fn(() => ({ toArray }));
  const find = vi.fn(() => ({ project }));
  return {
    pgQuery: vi.fn(),
    mongoInsertOne: vi.fn(),
    mongoToArray: toArray,
    mongoProject: project,
    mongoFind: find,
  };
});

vi.mock("../src/db/postgres.js", () => ({
  pgPool: { query: pgQuery },
}));

vi.mock("../src/db/mongo.js", () => ({
  getMongoDb: () => ({
    collection: () => ({
      find: mongoFind,
      insertOne: mongoInsertOne,
    }),
  }),
}));

import { UserService } from "../src/services/user.service.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserService", () => {
  describe("validate", () => {
    it("valida correctamente con name y email válidos", () => {
      const result = UserService.validate({ name: "Carlos", email: "carlos@test.com" });
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("falla si name no está presente o está vacío", () => {
      const resultEmpty = UserService.validate({ name: "   ", email: "carlos@test.com" });
      expect(resultEmpty.isValid).toBe(false);
      expect(resultEmpty.error).toBe("name and email are required");

      const resultMissing = UserService.validate({ email: "carlos@test.com" });
      expect(resultMissing.isValid).toBe(false);
    });

    it("falla si email no está presente o está vacío", () => {
      const resultEmpty = UserService.validate({ name: "Carlos", email: "   " });
      expect(resultEmpty.isValid).toBe(false);
      expect(resultEmpty.error).toBe("name and email are required");

      const resultMissing = UserService.validate({ name: "Carlos" });
      expect(resultMissing.isValid).toBe(false);
    });
  });

  describe("getPostgresUsers", () => {
    it("obtiene la lista de usuarios desde PostgreSQL", async () => {
      const mockUsers = [
        { id: 1, name: "Maria", email: "maria@example.com", created_at: "2026-10-08T00:00:00.000Z" },
      ];
      pgQuery.mockResolvedValueOnce({}); // CREATE TABLE IF NOT EXISTS
      pgQuery.mockResolvedValueOnce({ rows: mockUsers }); // SELECT

      const result = await UserService.getPostgresUsers();

      expect(pgQuery).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUsers);
    });
  });

  describe("createPostgresUser", () => {
    it("crea y retorna un usuario en PostgreSQL", async () => {
      const createdUser = {
        id: 2,
        name: "Pedro",
        email: "pedro@example.com",
        created_at: "2026-10-08T00:00:00.000Z",
      };
      pgQuery.mockResolvedValueOnce({}); // CREATE TABLE
      pgQuery.mockResolvedValueOnce({ rows: [createdUser] }); // INSERT

      const result = await UserService.createPostgresUser("Pedro", "pedro@example.com");

      expect(pgQuery).toHaveBeenCalledTimes(2);
      expect(result).toEqual(createdUser);
    });
  });

  describe("getMongoUsers", () => {
    it("obtiene la lista de usuarios desde MongoDB", async () => {
      const mockUsers = [
        { _id: "mongo1", name: "Sofia", email: "sofia@example.com", createdAt: new Date() },
      ];
      mongoToArray.mockResolvedValueOnce(mockUsers);

      const result = await UserService.getMongoUsers();

      expect(mongoFind).toHaveBeenCalledWith({});
      expect(mongoProject).toHaveBeenCalledWith({ name: 1, email: 1, createdAt: 1 });
      expect(result).toEqual(mockUsers);
    });
  });

  describe("createMongoUser", () => {
    it("inserta y retorna un usuario en MongoDB", async () => {
      mongoInsertOne.mockResolvedValueOnce({ insertedId: "mongo-id-123" });

      const result = await UserService.createMongoUser("Sofia", "sofia@example.com");

      expect(mongoInsertOne).toHaveBeenCalledOnce();
      expect(result._id).toBe("mongo-id-123");
      expect(result.name).toBe("Sofia");
      expect(result.email).toBe("sofia@example.com");
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});
