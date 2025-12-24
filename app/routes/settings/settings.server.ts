import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { z } from "zod";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayName: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.string().optional()),
  description: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.string().optional()),
  website: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.string().url("Must be a valid URL").optional()),
  logoUrl: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.string().url("Must be a valid URL").optional()),
});

export async function settingsLoader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request);

  const organization = await db.organization.findFirst({
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      website: true,
      logoUrl: true,
    },
  });

  if (!organization) {
    return data({ error: "Organization not found" }, { status: 404 });
  }

  return data({ organization, user: { name: user.name, email: user.email } });
}

export async function settingsAction({ request }: ActionFunctionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-organization") {
    return handleUpdateOrganization(formData);
  }

  return data({ error: "Invalid action" }, { status: 400 });
}

async function handleUpdateOrganization(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    displayName: formData.get("displayName"),
    description: formData.get("description"),
    website: formData.get("website"),
    logoUrl: formData.get("logoUrl"),
  };

  const parseResult = updateOrganizationSchema.safeParse(rawData);

  if (!parseResult.success) {
    const errors: Record<string, string> = {};
    for (const error of parseResult.error.issues) {
      const field = error.path[0] as string;
      errors[field] = error.message;
    }
    return data({ errors }, { status: 400 });
  }

  const organization = await db.organization.findFirst({
    select: { id: true },
  });

  if (!organization) {
    return data({ error: "Organization not found" }, { status: 404 });
  }

  const updateData = {
    name: parseResult.data.name,
    displayName: parseResult.data.displayName || null,
    description: parseResult.data.description || null,
    website: parseResult.data.website || null,
    logoUrl: parseResult.data.logoUrl || null,
  };

  await db.organization.update({
    where: { id: organization.id },
    data: updateData,
  });

  return data({ success: true });
}
