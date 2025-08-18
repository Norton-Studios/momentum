import type { PrismaClient } from "@mmtm/database";

export interface TenantEnvironment {
  tenantId: string;
  dataSource: string;
  env: Record<string, string>;
}

/**
 * Query tenant configurations from the database
 */
export async function getTenantConfigurations(db: PrismaClient): Promise<TenantEnvironment[]> {
  const configs = await db.tenantDataSourceConfig.findMany({
    include: { tenant: true },
  });

  // Group configurations by tenant and data source
  const grouped = new Map<string, Array<(typeof configs)[0]>>();

  for (const config of configs) {
    const key = `${config.tenantId}:${config.dataSource}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(config);
  }

  // Build environment objects
  const environments: TenantEnvironment[] = [];

  grouped.forEach((configGroup, key) => {
    const [tenantId, dataSource] = key.split(":");
    const env: Record<string, string> = {};

    for (const config of configGroup) {
      env[config.key] = config.value;
    }

    environments.push({ tenantId, dataSource, env });
  });

  return environments;
}
