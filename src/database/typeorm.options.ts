// opções comuns do banco, usadas pela API (app.module) e pela CLI do TypeORM (data-source)
export function baseDataSourceOptions(url: string) {
  return {
    type: 'postgres' as const,
    url,
    // em produção as migrations compiladas ficam em dist/database/migrations
    migrations: [`${import.meta.dirname}/migrations/*.js`],
    extra: {
      // conexões no pool; o plano grátis do Neon aguenta bem um número pequeno
      max: Number(process.env.DB_POOL_MAX ?? 10),
    },
  };
}
