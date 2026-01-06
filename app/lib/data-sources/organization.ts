import type { DbClient } from "~/db.server.ts";
import type { DataSourceProvider } from "./validation";

export async function getOrCreateOrganization(db: DbClient) {
  let organization = await db.organization.findFirst({
    select: {
      id: true,
      name: true,
      displayName: true,
      onboardingCompletedAt: true,
    },
  });
  if (!organization) {
    organization = await db.organization.create({
      data: {
        name: "default",
        displayName: "Default Organization",
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        onboardingCompletedAt: true,
      },
    });
  }
  return organization;
}

export async function upsertDataSource(db: DbClient, organizationId: string, provider: string, providerEnum: DataSourceProvider): Promise<string> {
  const existingDataSource = await db.dataSource.findFirst({
    where: {
      organizationId,
      provider: providerEnum,
    },
  });

  if (existingDataSource) {
    await db.dataSource.update({
      where: { id: existingDataSource.id },
      data: { isEnabled: true },
    });
    return existingDataSource.id;
  }

  const newDataSource = await db.dataSource.create({
    data: {
      organizationId,
      name: `${provider} Integration`,
      provider: providerEnum,
      isEnabled: true,
    },
  });
  return newDataSource.id;
}

export async function saveDataSourceConfigs(db: DbClient, dataSourceId: string, configs: Record<string, string>) {
  await Promise.all(
    Object.entries(configs).map(([key, value]) => {
      const isSecret = key.toLowerCase().includes("token") || key.toLowerCase().includes("password");
      return db.dataSourceConfig.upsert({
        where: { dataSourceId_key: { dataSourceId, key } },
        create: { dataSourceId, key, value, isSecret },
        update: { value },
      });
    })
  );
}
