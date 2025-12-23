import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useFetcher, useLoaderData } from "react-router";
import { Button } from "~/components/button/button";
import { SelectableList } from "~/components/selectable-list/selectable-list";
import { SettingsLayout } from "../settings-layout";
import { teamDetailAction, teamDetailLoader } from "./team.$teamId.server";
import "./team.$teamId.css";

export function meta({ data }: { data: { team: { name: string } } }) {
  return [
    { title: `${data.team.name} - Teams - Settings - Momentum` },
    {
      name: "description",
      content: `Manage ${data.team.name} team assignments`,
    },
  ];
}

export async function loader(args: LoaderFunctionArgs) {
  return teamDetailLoader(args);
}

export async function action(args: ActionFunctionArgs) {
  return teamDetailAction(args);
}

export default function TeamDetail() {
  const { team, allRepositories, allProjects } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const [isEditing, setIsEditing] = useState(false);
  const fetcher = useFetcher();

  const selectedRepositoryIds = useMemo(() => new Set(team.repositories.map((r) => r.repository.id)), [team.repositories]);

  const selectedProjectIds = useMemo(() => new Set(team.projects.map((p) => p.project.id)), [team.projects]);

  return (
    <SettingsLayout activeTab="teams">
      <div className="team-detail-header">
        <Link to="/settings/teams" className="back-link">
          ← Back to Teams
        </Link>
      </div>

      <div className="team-info-section">
        {isEditing ? (
          <Form method="post" onSubmit={() => setIsEditing(false)} className="team-edit-form">
            <input type="hidden" name="intent" value="update-team" />

            <div className="form-header">
              <h2>Edit Team</h2>
              <button type="button" className="close-btn" onClick={() => setIsEditing(false)}>
                ✕
              </button>
            </div>

            {errors?.form && <div className="form-error-banner">{errors.form}</div>}

            <div className="form-group">
              <label htmlFor="name">Team Name</label>
              <input type="text" id="name" name="name" defaultValue={team.name} required />
              {errors && "name" in errors && errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" defaultValue={team.description || ""} rows={3} />
              {errors && "description" in errors && errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </Form>
        ) : (
          <div className="team-info">
            <div className="team-info-content">
              <h2>{team.name}</h2>
              {team.description && <p className="team-description">{team.description}</p>}
            </div>
            <Button onClick={() => setIsEditing(true)}>Edit Team</Button>
          </div>
        )}
      </div>

      <div className="team-assignments">
        <div className="assignment-section">
          <h3>Repositories ({team.repositories.length})</h3>
          <p className="section-subtitle">Assign repositories to this team</p>

          <SelectableList
            items={allRepositories}
            selectedIds={selectedRepositoryIds}
            onToggle={(id, isSelected) => {
              fetcher.submit(
                {
                  intent: "toggle-repository",
                  repositoryId: id,
                  isSelected: String(isSelected),
                },
                { method: "post" }
              );
            }}
            renderItem={(repo) => (
              <div className="assignment-item">
                <div className="assignment-name">{repo.name}</div>
                {repo.description && <div className="assignment-description">{repo.description}</div>}
              </div>
            )}
            emptyMessage="No repositories available"
          />
        </div>

        <div className="assignment-section">
          <h3>Projects ({team.projects.length})</h3>
          <p className="section-subtitle">Assign projects to this team</p>

          <SelectableList
            items={allProjects}
            selectedIds={selectedProjectIds}
            onToggle={(id, isSelected) => {
              fetcher.submit(
                {
                  intent: "toggle-project",
                  projectId: id,
                  isSelected: String(isSelected),
                },
                { method: "post" }
              );
            }}
            renderItem={(project) => (
              <div className="assignment-item">
                <div className="assignment-name">
                  {project.name} <span className="project-key">({project.key})</span>
                </div>
                {project.description && <div className="assignment-description">{project.description}</div>}
              </div>
            )}
            emptyMessage="No projects available"
          />
        </div>
      </div>
    </SettingsLayout>
  );
}
