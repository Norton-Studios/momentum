import fg from "fast-glob";
import fs from "fs/promises";
import path from "path";

async function synthesise() {
  const baseSchemaPath = path.join(__dirname, "prisma/schema.prisma");
  const baseSchema = await fs.readFile(baseSchemaPath, "utf-8");

  const resourcesDir = path.join(__dirname, "../../plugins/resources");
  const schemaPaths = await fg("**/db/schema.prisma", {
    cwd: resourcesDir,
    absolute: true,
  });

  let combinedSchema = baseSchema;
  const definedModels = new Set<string>();

  for (const schemaPath of schemaPaths) {
    const schemaContent = await fs.readFile(schemaPath, "utf-8");
    const modelDefinitions = schemaContent.match(
      /(^(model|enum|type)[\s\S]*?^})/gm,
    );

    if (modelDefinitions) {
      for (const model of modelDefinitions) {
        const modelNameMatch = model.match(/^(?:model|enum|type)\s+(\w+)/);
        if (modelNameMatch && !definedModels.has(modelNameMatch[1])) {
          combinedSchema += `\n${model}`;
          definedModels.add(modelNameMatch[1]);
        }
      }
    }
  }

  const buildDir = path.join(__dirname, "build");
  await fs.mkdir(buildDir, { recursive: true });
  await fs.writeFile(path.join(buildDir, "schema.prisma"), combinedSchema);

  console.log("Prisma schema synthesised successfully!");
}

synthesise().catch((e) => {
  console.error(e);
  process.exit(1);
});
