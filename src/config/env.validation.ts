// valida as variáveis de ambiente na inicialização:
// se faltar algo obrigatório, a API nem sobe (melhor falhar no deploy do que em produção)
const SAME_SITE_VALUES = ['lax', 'strict', 'none'];

export function validateEnv(
  config: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const errors: string[] = [];
  const isProduction = config.NODE_ENV === 'production';

  if (!config.DATABASE_URL) errors.push('DATABASE_URL é obrigatória');

  const jwtSecret = config.JWT_SECRET ?? '';
  if (!jwtSecret) {
    errors.push('JWT_SECRET é obrigatória');
  } else if (isProduction && jwtSecret.length < 32) {
    errors.push('JWT_SECRET precisa ter pelo menos 32 caracteres em produção');
  }

  const sameSite = config.COOKIE_SAMESITE;
  if (sameSite !== undefined && !SAME_SITE_VALUES.includes(sameSite)) {
    errors.push('COOKIE_SAMESITE deve ser lax, strict ou none');
  }

  const cookiePath = config.REFRESH_COOKIE_PATH;
  if (cookiePath !== undefined && !cookiePath.startsWith('/')) {
    errors.push('REFRESH_COOKIE_PATH deve começar com "/"');
  }

  const trustProxy = config.TRUST_PROXY;
  if (trustProxy !== undefined && !/^\d+$/.test(trustProxy)) {
    errors.push(
      'TRUST_PROXY deve ser um número inteiro (quantidade de proxies)',
    );
  }

  if (isProduction && sameSite === 'none' && !config.FRONTEND_URL) {
    errors.push('COOKIE_SAMESITE=none exige FRONTEND_URL (origem do front-end)');
  }

  if (errors.length) {
    throw new Error(
      `Variáveis de ambiente inválidas:\n- ${errors.join('\n- ')}`,
    );
  }
  return config;
}
