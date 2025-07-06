import fg from "fast-glob";
import fs from "fs/promises";
import path from "path";

async function synthesise() {
  const schemaDir = path.join(__dirname, "../../plugins/resources");
  const schemaPaths = await fg("**/db/schema.prisma", {
    cwd: schemaDir,
    absolute: true,
  });

  let combinedSchema = "";
  let dataSource = "";
  let generator = "";

  for (const schemaPath of schemaPaths) {
    const schemaContent = await fs.readFile(schemaPath, "utf-8");
    const lines = schemaContent.split("\n");

    if (!dataSource) {
      dataSource = lines.find((line) => line.startsWith("datasource")) || "";
    }
    if (!generator) {
      generator = lines.find((line) => line.startsWith("generator")) || "";
    }

    const modelLines = lines.filter(
      (line) =>
        line.startsWith("model") ||
        line.startsWith("enum") ||
        line.startsWith("type") ||
        line.startsWith("  ") ||
        line.startsWith("}"),
    );

    combinedSchema += modelLines.join("\n") + "\n\n";
  }

  const finalSchema = `${dataSource}\n${generator}\n\n${combinedSchema}`;
  const buildDir = path.join(__dirname, "build");
  await fs.mkdir(buildDir, { recursive: true });
  await fs.writeFile(path.join(buildDir, "schema.prisma"), finalSchema);

  console.log("Prisma schema synthesised successfully!");
}

synthesise().catch((e) => {
  console.error(e);
  process.exit(1);
});
