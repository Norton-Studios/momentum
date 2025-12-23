import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { Button } from "~/components/button/button";
import { SettingsLayout } from "../settings-layout";
import { teamsAction, teamsLoader } from "./teams.server";
import "./teams.css";

export function meta() {
  return [
    { title: "Teams - Settings - Momentum" },
    {
      name: "description",
      content: "Manage teams and assign repositories and projects",
    },
  ];
}

export async function loader(args: LoaderFunctionArgs) {
  return teamsLoader(args);
}

export async function action(args: ActionFunctionArgs) {
  return teamsAction(args);
}

export default function Teams() {
  const { teams } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const [isCreating, setIsCreating] = useState(false);

  return (
    <SettingsLayout activeTab="teams">
      <div className="teams-header">
        <div>
          <h2>Teams</h2>
          <p className="teams-subtitle">Organize your work by creating teams and assigning repositories and projects</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>Create Team</Button>
      </div>

      {isCreating && (
        <div className="create-team-form">
          <Form method="post" onSubmit={() => setIsCreating(false)}>
            <input type="hidden" name="intent" value="create-team" />

            <div className="form-header">
              <h3>Create New Team</h3>
              <button type="button" className="close-btn" onClick={() => setIsCreating(false)}>
                ✕
              </button>
            </div>

            {errors?.form && <div className="form-error-banner">{errors.form}</div>}

            <div className="form-group">
              <label htmlFor="name">Team Name</label>
              <input type="text" id="name" name="name" placeholder="e.g., Frontend Team" required />
              {errors && "name" in errors && errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" placeholder="Describe the team's focus and responsibilities" rows={3} />
              {errors && "description" in errors && errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Team</Button>
            </div>
          </Form>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty-state">
          <h3>No teams yet</h3>
          <p>Create your first team to organize repositories and projects</p>
          <Button onClick={() => setIsCreating(true)}>Create Your First Team</Button>
        </div>
      ) : (
        <div className="teams-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Repositories</th>
                <th>Projects</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <TeamRow key={team.id} team={team} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SettingsLayout>
  );
}

function TeamRow({ team }: TeamRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <tr>
      <td>
        <Link to={`/settings/teams/${team.id}`} className="team-name">
          {team.name}
        </Link>
      </td>
      <td>{team.description || <span className="no-description">No description</span>}</td>
      <td>{team._count.repositories}</td>
      <td>{team._count.projects}</td>
      <td>
        {isDeleting ? (
          <Form method="post" className="delete-confirm-form">
            <input type="hidden" name="intent" value="delete-team" />
            <input type="hidden" name="teamId" value={team.id} />
            <span className="delete-confirm-text">Delete?</span>
            <button type="submit" className="confirm-btn">
              Yes
            </button>
            <button type="button" className="cancel-btn" onClick={() => setIsDeleting(false)}>
              No
            </button>
          </Form>
        ) : (
          <button type="button" className="delete-btn" onClick={() => setIsDeleting(true)}>
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

interface TeamRowProps {
  team: {
    id: string;
    name: string;
    description: string | null;
    _count: {
      repositories: number;
      projects: number;
    };
  };
}
