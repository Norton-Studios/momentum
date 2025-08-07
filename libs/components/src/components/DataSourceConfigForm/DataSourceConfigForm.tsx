import { useState } from "react";
import { Button } from "../Button/Button";
import { FormInput } from "../FormInput/FormInput";
import { Alert } from "../Alert/Alert";
import { Card } from "../Card/Card";
import styles from "./DataSourceConfigForm.module.css";

export interface DataSourceConfig {
  dataSource: string;
  instanceId?: string;
  name: string;
  fields: Record<string, string>;
  connected?: boolean;
  error?: string;
}

export interface DataSourceProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  required: boolean;
  fields: {
    key: string;
    label: string;
    type: "text" | "password" | "url" | "email";
    placeholder?: string;
    help?: string;
    required?: boolean;
  }[];
}

export interface DataSourceConfigFormProps {
  providers: DataSourceProvider[];
  configurations: DataSourceConfig[];
  onConfigurationChange: (configs: DataSourceConfig[]) => void;
  onTestConnection: (config: DataSourceConfig) => Promise<{ success: boolean; error?: string }>;
  isSubmitting?: boolean;
  error?: string;
}

export function DataSourceConfigForm({
  providers,
  configurations,
  onConfigurationChange,
  onTestConnection,
  isSubmitting = false,
  error,
}: DataSourceConfigFormProps) {
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleAddConfiguration = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const existingCount = configurations.filter((c) => c.dataSource === providerId).length;
    const newConfig: DataSourceConfig = {
      dataSource: providerId,
      instanceId: existingCount > 0 ? `instance-${existingCount + 1}` : undefined,
      name: existingCount > 0 ? `${provider.name} ${existingCount + 1}` : provider.name,
      fields: {},
    };

    onConfigurationChange([...configurations, newConfig]);
    setExpandedCards((prev) => new Set([...prev, getConfigId(newConfig)]));
  };

  const handleRemoveConfiguration = (configId: string) => {
    const newConfigs = configurations.filter((c) => getConfigId(c) !== configId);
    onConfigurationChange(newConfigs);
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      newSet.delete(configId);
      return newSet;
    });
  };

  const handleFieldChange = (configId: string, fieldKey: string, value: string) => {
    const newConfigs = configurations.map((config) => {
      if (getConfigId(config) === configId) {
        return {
          ...config,
          fields: { ...config.fields, [fieldKey]: value },
          error: undefined, // Clear error when user makes changes
        };
      }
      return config;
    });
    onConfigurationChange(newConfigs);
  };

  const handleNameChange = (configId: string, name: string) => {
    const newConfigs = configurations.map((config) => {
      if (getConfigId(config) === configId) {
        return { ...config, name };
      }
      return config;
    });
    onConfigurationChange(newConfigs);
  };

  const handleTestConnection = async (configId: string) => {
    const config = configurations.find((c) => getConfigId(c) === configId);
    if (!config) return;

    setTestingConnections((prev) => new Set([...prev, configId]));

    try {
      const result = await onTestConnection(config);

      const newConfigs = configurations.map((c) => {
        if (getConfigId(c) === configId) {
          return {
            ...c,
            connected: result.success,
            error: result.error,
          };
        }
        return c;
      });
      onConfigurationChange(newConfigs);
    } finally {
      setTestingConnections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  const toggleCardExpansion = (configId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(configId)) {
        newSet.delete(configId);
      } else {
        newSet.add(configId);
      }
      return newSet;
    });
  };

  const getConfigId = (config: DataSourceConfig): string => {
    return config.instanceId ? `${config.dataSource}-${config.instanceId}` : config.dataSource;
  };

  const getProvider = (dataSource: string) => {
    return providers.find((p) => p.id === dataSource);
  };

  const isConfigurationValid = (config: DataSourceConfig): boolean => {
    const provider = getProvider(config.dataSource);
    if (!provider) return false;

    return provider.fields.every((field) => {
      if (field.required === false) return true;
      return config.fields[field.key]?.trim();
    });
  };

  const hasRequiredVCS = configurations.some((config) => {
    const provider = getProvider(config.dataSource);
    return provider?.required && config.connected;
  });

  const _canProceed = hasRequiredVCS && configurations.length > 0;

  return (
    <div className={styles.dataSourceForm}>
      <div className={styles.header}>
        <h2 className={styles.title}>Connect Your Data Sources</h2>
        <p className={styles.subtitle}>Connect your development tools to start collecting productivity insights</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className={styles.providersGrid}>
        {providers.map((provider) => {
          const existingConfigs = configurations.filter((c) => c.dataSource === provider.id);
          const hasConfig = existingConfigs.length > 0;

          return (
            <div key={provider.id} className={styles.providerSection}>
              <div className={styles.providerHeader}>
                <div className={styles.providerInfo}>
                  <span className={styles.providerIcon}>{provider.icon}</span>
                  <div>
                    <h3 className={styles.providerName}>
                      {provider.name}
                      {provider.required && <span className={styles.required}> *</span>}
                    </h3>
                    <p className={styles.providerDescription}>{provider.description}</p>
                  </div>
                </div>

                <Button variant="secondary" size="sm" onClick={() => handleAddConfiguration(provider.id)} disabled={isSubmitting}>
                  {hasConfig ? "Add Another" : "Configure"}
                </Button>
              </div>

              {existingConfigs.map((config) => {
                const configId = getConfigId(config);
                const isExpanded = expandedCards.has(configId);
                const isTesting = testingConnections.has(configId);
                const isValid = isConfigurationValid(config);

                return (
                  <Card key={configId} className={styles.configCard}>
                    <div className={styles.configHeader}>
                      <div className={styles.configInfo}>
                        <FormInput
                          id={`${configId}-name`}
                          label="Instance Name"
                          type="text"
                          value={config.name}
                          onChange={(value) => handleNameChange(configId, value)}
                          placeholder={`${provider.name} Instance`}
                          disabled={isSubmitting}
                          className={styles.nameInput}
                        />

                        <div className={styles.connectionStatus}>
                          {config.connected && <span className={styles.connected}>✓ Connected</span>}
                          {config.error && <span className={styles.error}>✗ {config.error}</span>}
                        </div>
                      </div>

                      <div className={styles.configActions}>
                        <Button variant="secondary" size="sm" onClick={() => toggleCardExpansion(configId)} disabled={isSubmitting}>
                          {isExpanded ? "Collapse" : "Configure"}
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRemoveConfiguration(configId)}
                          disabled={isSubmitting}
                          className={styles.removeButton}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={styles.configFields}>
                        {provider.fields.map((field) => (
                          <FormInput
                            key={field.key}
                            id={`${configId}-${field.key}`}
                            label={field.label}
                            type={field.type}
                            value={config.fields[field.key] || ""}
                            onChange={(value) => handleFieldChange(configId, field.key, value)}
                            placeholder={field.placeholder}
                            helperText={field.help}
                            required={field.required !== false}
                            disabled={isSubmitting}
                          />
                        ))}

                        <div className={styles.testConnection}>
                          <Button variant="secondary" onClick={() => handleTestConnection(configId)} disabled={!isValid || isSubmitting || isTesting}>
                            {isTesting ? "Testing..." : "Test Connection"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        {!hasRequiredVCS && <Alert variant="warning">You must configure at least one Version Control System (marked with *) to proceed.</Alert>}

        <div className={styles.progress}>
          <p className={styles.progressText}>
            {configurations.filter((c) => c.connected).length} of {configurations.length} data sources connected
          </p>
        </div>
      </div>
    </div>
  );
}
