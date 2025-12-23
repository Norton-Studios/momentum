import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function teamsLoader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request);

  const teams = await fetchTeams();

  return { teams, user: { name: user.name, email: user.email } };
}

export async function teamsAction({ request }: ActionFunctionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-team") {
    return handleCreateTeam(formData);
  }

  if (intent === "delete-team") {
    return handleDeleteTeam(formData);
  }

  return data({ errors: { form: "Invalid action" } }, { status: 400 });
}

async function fetchTeams() {
  return db.team.findMany({
    include: {
      _count: {
        select: {
          repositories: true,
          projects: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

async function handleCreateTeam(formData: FormData) {
  const name = formData.get("name");
  const description = formData.get("description");

  const errors: ActionErrors = {};

  if (typeof name !== "string" || name.trim().length === 0) {
    errors.name = "Team name is required";
  }

  if (typeof description !== "string") {
    errors.description = "Description must be a string";
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  await db.team.create({
    data: {
      name: (name as string).trim(),
      description: description && typeof description === "string" && description.trim().length > 0 ? description.trim() : null,
    },
  });

  return redirect("/settings/teams");
}

async function handleDeleteTeam(formData: FormData) {
  const teamId = formData.get("teamId");

  if (typeof teamId !== "string" || teamId.length === 0) {
    return data({ errors: { form: "Team ID is required" } }, { status: 400 });
  }

  await db.team.delete({
    where: { id: teamId },
  });

  return redirect("/settings/teams");
}

interface ActionErrors {
  name?: string;
  description?: string;
  form?: string;
}
