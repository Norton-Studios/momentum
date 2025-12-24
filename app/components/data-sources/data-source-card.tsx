import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { PROVIDER_CONFIGS } from "~/lib/data-sources";
import { ProjectsSection } from "./projects-section";
import { RepositoriesSection } from "./repositories-section";

export function DataSourceCard({ source, isFormActive, isRepositoriesExpanded, onToggleForm, onToggleRepositories, configs, onConnectionSuccess }: DataSourceCardProps) {
  const providerConfig = PROVIDER_CONFIGS[source.id];
  const fetcher = useFetcher();
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    return Object.keys(configs).length > 0 ? configs : {};
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetcherData = fetcher.data as { testSuccess?: boolean; testError?: string; success?: boolean; provider?: string } | undefined;
  const testSuccess = fetcherData?.testSuccess && fetcherData?.provider === source.id;
  const testError = fetcherData?.testError && fetcherData?.provider === source.id ? fetcherData.testError : null;
  const saveSuccess = fetcherData?.success && fetcherData?.provider === source.id;

  useEffect(() => {
    if (!hasInitialized && Object.keys(configs).length > 0) {
      setFormValues(configs);
      setHasInitialized(true);
    }
  }, [configs, hasInitialized]);

  useEffect(() => {
    if (saveSuccess) {
      onConnectionSuccess(source.id);
    }
  }, [saveSuccess, source.id, onConnectionSuccess]);

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const shouldShowField = (field: { showWhen?: Record<string, string> }): boolean => {
    if (!field.showWhen) return true;
    return Object.entries(field.showWhen).every(([key, value]) => formValues[key] === value);
  };

  const handleSubmit = (intent: string) => {
    const formData = new FormData();
    formData.append("intent", intent);
    formData.append("provider", source.id);
    for (const [key, value] of Object.entries(formValues)) {
      formData.append(key, value);
    }
    fetcher.submit(formData, { method: "post" });
  };

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className={`datasource-card ${source.isConnected || saveSuccess ? "connected" : ""}`} id={`${source.id}Card`}>
      <div className="card-header">
        <div className="datasource-info">
          <div className="datasource-title">
            <span className="datasource-icon">{source.icon}</span>
            <h3>{source.name}</h3>
          </div>
          <p>{source.description}</p>
        </div>
        <span className={`status-badge ${source.isConnected || saveSuccess ? "connected" : ""}`} id={`${source.id}Status`}>
          {source.isConnected || saveSuccess ? "Connected" : "Not Connected"}
        </span>
      </div>

      <button type="button" className="btn-configure" onClick={() => onToggleForm(source.id)}>
        {source.isConnected || saveSuccess ? `Edit ${source.name} Configuration` : `Configure ${source.name}`}
      </button>

      {isFormActive && (
        <div className="config-form active">
          <input type="hidden" name="provider" value={source.id} />
          {providerConfig?.fields.map((field) => {
            if (!shouldShowField(field)) return null;

            return (
              <div className="form-group" key={field.key}>
                <label htmlFor={`${source.id}-${field.key}`}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === "select" && field.options ? (
                  <select
                    id={`${source.id}-${field.key}`}
                    name={field.key}
                    required={field.required}
                    value={formValues[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    id={`${source.id}-${field.key}`}
                    name={field.key}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formValues[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
          {testSuccess && <div className="test-success">Connection successful!</div>}
          {testError && <div className="test-error">{testError}</div>}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => onToggleForm(source.id)}>
              Cancel
            </button>
            <button type="button" className="btn-test" onClick={() => handleSubmit("test")} disabled={isSubmitting}>
              {isSubmitting ? "Testing..." : "Test Connection"}
            </button>
            <button type="button" className="btn-save" onClick={() => handleSubmit("connect")} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}

      {source.isVcs && (source.isConnected || saveSuccess) && (
        <RepositoriesSection provider={source.id} isExpanded={isRepositoriesExpanded} onToggle={() => onToggleRepositories(source.id)} />
      )}
      {source.isProjectManagement && (source.isConnected || saveSuccess) && (
        <ProjectsSection provider={source.id} isExpanded={isRepositoriesExpanded} onToggle={() => onToggleRepositories(source.id)} />
      )}
    </div>
  );
}

export interface DataSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  isConnected: boolean;
  isRequired?: boolean;
  isVcs: boolean;
  isProjectManagement: boolean;
}

export interface DataSourceCardProps {
  source: DataSource;
  isFormActive: boolean;
  isRepositoriesExpanded: boolean;
  onToggleForm: (id: string) => void;
  onToggleRepositories: (id: string) => void;
  onConnectionSuccess: (provider: string) => void;
  configs: Record<string, string>;
}
