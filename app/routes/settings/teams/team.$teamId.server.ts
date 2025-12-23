import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function teamDetailLoader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAdmin(request);

  const teamId = params.teamId;

  if (!teamId) {
    throw new Response("Team not found", { status: 404 });
  }

  const team = await fetchTeam(teamId);

  if (!team) {
    throw new Response("Team not found", { status: 404 });
  }

  const allRepositories = await fetchAllRepositories();
  const allProjects = await fetchAllProjects();

  return {
    team,
    allRepositories,
    allProjects,
    user: { name: user.name, email: user.email },
  };
}

export async function teamDetailAction({ request, params }: ActionFunctionArgs) {
  await requireAdmin(request);

  const teamId = params.teamId;

  if (!teamId) {
    throw new Response("Team not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-team") {
    return handleUpdateTeam(teamId, formData);
  }

  if (intent === "toggle-repository") {
    return handleToggleRepository(teamId, formData);
  }

  if (intent === "toggle-project") {
    return handleToggleProject(teamId, formData);
  }

  return data({ errors: { form: "Invalid action" } }, { status: 400 });
}

async function fetchTeam(teamId: string) {
  return db.team.findUnique({
    where: { id: teamId },
    include: {
      repositories: {
        include: {
          repository: true,
        },
      },
      projects: {
        include: {
          project: true,
        },
      },
    },
  });
}

async function fetchAllRepositories() {
  return db.repository.findMany({
    where: { isEnabled: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      fullName: true,
      description: true,
    },
  });
}

async function fetchAllProjects() {
  return db.project.findMany({
    where: { isEnabled: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
    },
  });
}

async function handleUpdateTeam(teamId: string, formData: FormData) {
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

  await db.team.update({
    where: { id: teamId },
    data: {
      name: (name as string).trim(),
      description: description && typeof description === "string" && description.trim().length > 0 ? description.trim() : null,
    },
  });

  return redirect(`/settings/teams/${teamId}`);
}

async function handleToggleRepository(teamId: string, formData: FormData) {
  const repositoryId = formData.get("repositoryId");
  const isSelected = formData.get("isSelected") === "true";

  if (typeof repositoryId !== "string" || repositoryId.length === 0) {
    return data({ errors: { form: "Repository ID is required" } }, { status: 400 });
  }

  if (isSelected) {
    await db.teamRepository.create({
      data: {
        teamId,
        repositoryId,
      },
    });
  } else {
    await db.teamRepository.deleteMany({
      where: {
        teamId,
        repositoryId,
      },
    });
  }

  return null;
}

async function handleToggleProject(teamId: string, formData: FormData) {
  const projectId = formData.get("projectId");
  const isSelected = formData.get("isSelected") === "true";

  if (typeof projectId !== "string" || projectId.length === 0) {
    return data({ errors: { form: "Project ID is required" } }, { status: 400 });
  }

  if (isSelected) {
    await db.teamProject.create({
      data: {
        teamId,
        projectId,
      },
    });
  } else {
    await db.teamProject.deleteMany({
      where: {
        teamId,
        projectId,
      },
    });
  }

  return null;
}

interface ActionErrors {
  name?: string;
  description?: string;
  form?: string;
}
