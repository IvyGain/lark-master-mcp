export interface Env {
  LARK_VERIFICATION_TOKEN: string;
  LARK_ENCRYPT_KEY?: string;
  LARK_APP_ID: string;
  LARK_APP_SECRET: string;
  LARK_DOMAIN?: string;
  /** Public HTTPS origin of this Worker, used to build OAuth redirect URIs. */
  PUBLIC_WORKER_ORIGIN?: string;
  /** Override if the OAuth redirect URI lives on a different host (e.g. Vercel). */
  LARK_OAUTH_REDIRECT_URI?: string;
  /** URL of the public landing page ("Add to Lark" button host). */
  PUBLIC_WEB_ORIGIN?: string;
  ANTHROPIC_API_KEY: string;
  BRAIN_URL: string;
  BRAIN_SHARED_SECRET: string;
  DB: D1Database;
  CACHE: KVNamespace;
  CONVERSATION: DurableObjectNamespace;
}
