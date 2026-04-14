export interface Env {
  LARK_VERIFICATION_TOKEN: string;
  LARK_ENCRYPT_KEY?: string;
  LARK_APP_ID: string;
  LARK_APP_SECRET: string;
  LARK_DOMAIN?: string;
  ANTHROPIC_API_KEY: string;
  BRAIN_URL: string;
  BRAIN_SHARED_SECRET: string;
  DB: D1Database;
  CACHE: KVNamespace;
  CONVERSATION: DurableObjectNamespace;
}
