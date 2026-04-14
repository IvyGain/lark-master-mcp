export interface BrainEnv {
  PORT: number;
  LARK_CLI_BIN: string;
  BRAIN_SHARED_SECRET: string;
  ANTHROPIC_API_KEY: string;
  LARK_DEFAULT_DOMAIN: string;
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): BrainEnv {
  const required = (k: string): string => {
    const v = env[k];
    if (!v) throw new Error(`Missing env var: ${k}`);
    return v;
  };
  return {
    PORT: Number(env.PORT ?? 8787),
    LARK_CLI_BIN: env.LARK_CLI_BIN ?? 'lark-cli',
    BRAIN_SHARED_SECRET: required('BRAIN_SHARED_SECRET'),
    ANTHROPIC_API_KEY: required('ANTHROPIC_API_KEY'),
    LARK_DEFAULT_DOMAIN: env.LARK_DEFAULT_DOMAIN ?? 'https://open.larksuite.com',
  };
}
