import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { settingsAction, settingsLoader } from "./settings.server";
import { SettingsLayout } from "./settings-layout";
import "./settings-layout.css";

export function meta() {
  return [{ title: "General Settings - Momentum" }, { name: "description", content: "Manage your organization details" }];
}

export async function loader(args: LoaderFunctionArgs) {
  return settingsLoader(args);
}

export async function action(args: ActionFunctionArgs) {
  return settingsAction(args);
}

export default function Settings() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if ("error" in loaderData) {
    return (
      <SettingsLayout activeTab="general">
        <div className="message message-error">{loaderData.error}</div>
      </SettingsLayout>
    );
  }

  const { organization } = loaderData;
  const errors = actionData && "errors" in actionData ? actionData.errors : undefined;
  const success = actionData && "success" in actionData ? actionData.success : false;

  return (
    <SettingsLayout activeTab="general">
      {success && <div className="message message-success">Organization details updated successfully</div>}

      {actionData && "error" in actionData && <div className="message message-error">{actionData.error}</div>}

      <div className="settings-section">
        <h2 className="section-title">Organization Details</h2>
        <p className="section-description">Update your organization information and branding</p>

        <Form method="post" className="settings-form">
          <input type="hidden" name="intent" value="update-organization" />

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Organization Name *
            </label>
            <input type="text" id="name" name="name" className="form-input" defaultValue={organization.name} required />
            {errors?.name && (
              <p className="form-hint" style={{ color: "#c62828" }}>
                {errors.name}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              className="form-input"
              defaultValue={organization.displayName || ""}
              placeholder="How your organization name appears"
            />
            {errors?.displayName && (
              <p className="form-hint" style={{ color: "#c62828" }}>
                {errors.displayName}
              </p>
            )}
            <p className="form-hint">The name shown to users throughout the application</p>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="form-input form-textarea"
              defaultValue={organization.description || ""}
              placeholder="Brief description of your organization"
            />
            {errors?.description && (
              <p className="form-hint" style={{ color: "#c62828" }}>
                {errors.description}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="website" className="form-label">
              Website
            </label>
            <input type="url" id="website" name="website" className="form-input" defaultValue={organization.website || ""} placeholder="https://example.com" />
            {errors?.website && (
              <p className="form-hint" style={{ color: "#c62828" }}>
                {errors.website}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="logoUrl" className="form-label">
              Logo URL
            </label>
            <input type="url" id="logoUrl" name="logoUrl" className="form-input" defaultValue={organization.logoUrl || ""} placeholder="https://example.com/logo.png" />
            {errors?.logoUrl && (
              <p className="form-hint" style={{ color: "#c62828" }}>
                {errors.logoUrl}
              </p>
            )}
            <p className="form-hint">URL to your organization logo image</p>
          </div>

          <button type="submit" className="save-button">
            Save Changes
          </button>
        </Form>
      </div>
    </SettingsLayout>
  );
}
