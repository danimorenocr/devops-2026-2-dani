/**
 * Contrato del almacén de productos.
 * El comportamiento lo definen los tests de tests/practica-productos.
 * Implementen los métodos. No cambien las firmas ni los códigos de ProductError.
 */
import { randomUUID } from "node:crypto";

export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProductInput = {
  name: string;
  sku: string;
  price: number;
  stock?: number;
  category?: string | null;
};

export type UpdateProductInput = {
  name?: string;
  sku?: string;
  price?: number;
  stock?: number;
  category?: string | null;
  active?: boolean;
};

export type ListProductsQuery = {
  search?: string;
  category?: string;
  active?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

export type ProductErrorCode = "VALIDATION" | "NOT_FOUND" | "DUPLICATE_SKU" | "INSUFFICIENT_STOCK";

export class ProductError extends Error {
  readonly code: ProductErrorCode;

  constructor(code: ProductErrorCode, message: string) {
    super(message);
    this.name = "ProductError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const SKU_REGEX = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function cloneProduct(product: Product): Product {
  return {
    ...product,
    createdAt: new Date(product.createdAt.getTime()),
    updatedAt: new Date(product.updatedAt.getTime()),
  };
}

function validateName(name: unknown): string {
  if (typeof name !== "string") {
    throw new ProductError("VALIDATION", "El nombre debe ser una cadena de texto");
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new ProductError("VALIDATION", "El nombre debe tener entre 1 y 80 caracteres");
  }
  return trimmed;
}

function validateSku(sku: unknown): string {
  if (typeof sku !== "string") {
    throw new ProductError("VALIDATION", "El SKU debe ser una cadena de texto");
  }
  const normalized = sku.trim().toUpperCase();
  if (normalized.length < 2 || normalized.length > 32 || !SKU_REGEX.test(normalized)) {
    throw new ProductError("VALIDATION", "El formato del SKU es inválido");
  }
  return normalized;
}

function validatePrice(price: unknown): number {
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    throw new ProductError("VALIDATION", "El precio debe ser un número finito mayor o igual a 0");
  }
  return price;
}

function validateStock(stock: unknown): number {
  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
    throw new ProductError("VALIDATION", "El stock debe ser un entero mayor o igual a 0");
  }
  return stock;
}

function validateCategory(category: unknown): string | null {
  if (category === undefined || category === null) {
    return null;
  }
  if (typeof category !== "string") {
    throw new ProductError("VALIDATION", "La categoría debe ser una cadena de texto o null");
  }
  const trimmed = category.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class ProductStore {
  private readonly products = new Map<string, Product>();

  create(input: CreateProductInput): Product {
    if (!input || typeof input !== "object") {
      throw new ProductError("VALIDATION", "Entrada inválida para crear producto");
    }

    const name = validateName(input.name);
    const sku = validateSku(input.sku);

    for (const existing of this.products.values()) {
      if (existing.sku === sku) {
        throw new ProductError("DUPLICATE_SKU", `El SKU '${sku}' ya está registrado`);
      }
    }

    const price = validatePrice(input.price);

    let stock = 0;
    if (input.stock !== undefined) {
      stock = validateStock(input.stock);
    }

    const category = validateCategory(input.category);

    const now = new Date();
    const storedProduct: Product = {
      id: randomUUID(),
      name,
      sku,
      price,
      stock,
      category,
      active: true,
      createdAt: new Date(now.getTime()),
      updatedAt: new Date(now.getTime()),
    };

    this.products.set(storedProduct.id, storedProduct);
    return cloneProduct(storedProduct);
  }

  getById(id: string): Product | null {
    if (typeof id !== "string" || id.length === 0) {
      return null;
    }
    const product = this.products.get(id);
    return product ? cloneProduct(product) : null;
  }

  getBySku(sku: string): Product | null {
    if (typeof sku !== "string") {
      return null;
    }
    const normalized = sku.trim().toUpperCase();
    if (normalized.length === 0) {
      return null;
    }

    for (const product of this.products.values()) {
      if (product.sku === normalized) {
        return cloneProduct(product);
      }
    }
    return null;
  }

  list(query?: ListProductsQuery): Product[] {
    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    if (query?.minPrice !== undefined) {
      if (typeof query.minPrice !== "number" || !Number.isFinite(query.minPrice) || query.minPrice < 0) {
        throw new ProductError("VALIDATION", "minPrice debe ser un número finito mayor o igual a 0");
      }
      minPrice = query.minPrice;
    }

    if (query?.maxPrice !== undefined) {
      if (typeof query.maxPrice !== "number" || !Number.isFinite(query.maxPrice) || query.maxPrice < 0) {
        throw new ProductError("VALIDATION", "maxPrice debe ser un número finito mayor o igual a 0");
      }
      maxPrice = query.maxPrice;
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new ProductError("VALIDATION", "minPrice no puede ser mayor que maxPrice");
    }

    let search: string | undefined;
    if (query?.search !== undefined) {
      if (typeof query.search !== "string") {
        throw new ProductError("VALIDATION", "search debe ser una cadena de texto");
      }
      const trimmedSearch = query.search.trim().toLowerCase();
      if (trimmedSearch.length > 0) {
        search = trimmedSearch;
      }
    }

    let category: string | undefined;
    if (query?.category !== undefined) {
      if (typeof query.category !== "string") {
        throw new ProductError("VALIDATION", "category debe ser una cadena de texto");
      }
      const trimmedCategory = query.category.trim().toLowerCase();
      if (trimmedCategory.length > 0) {
        category = trimmedCategory;
      }
    }

    if (query?.active !== undefined && typeof query.active !== "boolean") {
      throw new ProductError("VALIDATION", "active debe ser un booleano");
    }
    const active = query?.active;

    const results: Product[] = [];

    for (const product of this.products.values()) {
      if (search !== undefined && !product.name.toLowerCase().includes(search)) {
        continue;
      }

      if (category !== undefined) {
        if (!product.category || product.category.toLowerCase() !== category) {
          continue;
        }
      }

      if (active !== undefined && product.active !== active) {
        continue;
      }

      if (minPrice !== undefined && product.price < minPrice) {
        continue;
      }

      if (maxPrice !== undefined && product.price > maxPrice) {
        continue;
      }

      results.push(cloneProduct(product));
    }

    results.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return a.sku.localeCompare(b.sku);
    });

    return results;
  }

  update(id: string, patch: UpdateProductInput): Product {
    if (typeof id !== "string" || id.length === 0) {
      throw new ProductError("NOT_FOUND", "Producto no encontrado");
    }

    const product = this.products.get(id);
    if (!product) {
      throw new ProductError("NOT_FOUND", `Producto con id '${id}' no encontrado`);
    }

    if (!patch || typeof patch !== "object") {
      throw new ProductError("VALIDATION", "Parche de actualización inválido");
    }

    const hasChanges =
      patch.name !== undefined ||
      patch.sku !== undefined ||
      patch.price !== undefined ||
      patch.stock !== undefined ||
      patch.category !== undefined ||
      patch.active !== undefined;

    if (!hasChanges) {
      return cloneProduct(product);
    }

    let nextName: string | undefined;
    if (patch.name !== undefined) {
      nextName = validateName(patch.name);
    }

    let nextSku: string | undefined;
    if (patch.sku !== undefined) {
      nextSku = validateSku(patch.sku);
      for (const existing of this.products.values()) {
        if (existing.id !== id && existing.sku === nextSku) {
          throw new ProductError("DUPLICATE_SKU", `El SKU '${nextSku}' ya pertenece a otro producto`);
        }
      }
    }

    let nextPrice: number | undefined;
    if (patch.price !== undefined) {
      nextPrice = validatePrice(patch.price);
    }

    let nextStock: number | undefined;
    if (patch.stock !== undefined) {
      nextStock = validateStock(patch.stock);
    }

    let nextCategory: string | null | undefined;
    if (patch.category !== undefined) {
      nextCategory = validateCategory(patch.category);
    }

    let nextActive: boolean | undefined;
    if (patch.active !== undefined) {
      if (typeof patch.active !== "boolean") {
        throw new ProductError("VALIDATION", "active debe ser un booleano");
      }
      nextActive = patch.active;
    }

    if (nextName !== undefined) product.name = nextName;
    if (nextSku !== undefined) product.sku = nextSku;
    if (nextPrice !== undefined) product.price = nextPrice;
    if (nextStock !== undefined) product.stock = nextStock;
    if (nextCategory !== undefined) product.category = nextCategory;
    if (nextActive !== undefined) product.active = nextActive;
    product.updatedAt = new Date();

    return cloneProduct(product);
  }

  remove(id: string): boolean {
    if (typeof id !== "string" || id.length === 0) {
      return false;
    }
    return this.products.delete(id);
  }

  adjustStock(id: string, delta: number): Product {
    if (typeof id !== "string" || id.length === 0) {
      throw new ProductError("NOT_FOUND", "Producto no encontrado");
    }

    const product = this.products.get(id);
    if (!product) {
      throw new ProductError("NOT_FOUND", `Producto con id '${id}' no encontrado`);
    }

    if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
      throw new ProductError("VALIDATION", "El ajuste de stock debe ser un entero distinto de cero");
    }

    const nextStock = product.stock + delta;
    if (nextStock < 0) {
      throw new ProductError("INSUFFICIENT_STOCK", "El ajuste dejaría el stock por debajo de 0");
    }

    product.stock = nextStock;
    product.updatedAt = new Date();

    return cloneProduct(product);
  }
}
