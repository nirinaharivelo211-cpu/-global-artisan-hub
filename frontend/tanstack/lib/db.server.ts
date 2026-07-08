import process from "node:process";

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function parseDbUrl(url: string): DbConfig {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)),
  };
}

export function getDbConfig(): DbConfig | null {
  const url = process.env.DATABASE_URL;
  if (url) return parseDbUrl(url);

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (host && user && database) {
    return { host, port: Number(port) || 5432, user, password: password ?? "", database };
  }

  return null;
}

let _sql: any = null;

export async function getDb() {
  if (_sql) return _sql;

  const config = getDbConfig();
  if (!config) return null;

  const { default: postgres } = await import("postgres");
  _sql = postgres({
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database: config.database,
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    types: {
      numeric: {
        to: 1700,
        from: [1700],
        parse: (x: string) => Number(x),
        serialize: (x: number) => String(x),
      },
    },
  });
  return _sql;
}

export async function query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  const sql = await getDb();
  if (!sql) throw new Error("Database not configured. Set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.");
  return sql<T[]>(strings, ...values);
}

export async function unsafeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not configured. Set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.");
  return db.unsafe(sql, params);
}

export class DbError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "DbError";
  }
}
