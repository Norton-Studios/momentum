// Dashboard Components
export { Button } from "./components/Button/Button";
export type { ButtonProps } from "./components/Button/Button";

export { MetricCard } from "./components/MetricCard/MetricCard";
export type { MetricCardProps } from "./components/MetricCard/MetricCard";

export { DateRangeSelector } from "./components/DateRangeSelector/DateRangeSelector";
export type { DateRangeSelectorProps, DateRange } from "./components/DateRangeSelector/DateRangeSelector";

export { Sidebar } from "./components/Sidebar/Sidebar";
export type { SidebarProps, NavItem } from "./components/Sidebar/Sidebar";

export { Chart } from "./components/Chart/Chart";
export type { ChartProps, ChartType } from "./components/Chart/Chart";

// Onboarding Components
export { StepIndicator } from "./components/StepIndicator/StepIndicator";
export type { StepIndicatorProps, Step } from "./components/StepIndicator/StepIndicator";

export { FormInput } from "./components/FormInput/FormInput";
export type { FormInputProps } from "./components/FormInput/FormInput";

export { Card } from "./components/Card/Card";
export type { CardProps } from "./components/Card/Card";

export { Alert } from "./components/Alert/Alert";
export type { AlertProps } from "./components/Alert/Alert";

export { SSOButton } from "./components/SSOButton/SSOButton";
export type { SSOButtonProps, SSOProvider } from "./components/SSOButton/SSOButton";

export { Divider } from "./components/Divider/Divider";
export type { DividerProps } from "./components/Divider/Divider";

export { Badge } from "./components/Badge/Badge";
export type { BadgeProps } from "./components/Badge/Badge";

export { ProgressBar } from "./components/ProgressBar/ProgressBar";
export type { ProgressBarProps } from "./components/ProgressBar/ProgressBar";

export { DataSourceCard } from "./components/DataSourceCard/DataSourceCard";
export type { DataSourceCardProps } from "./components/DataSourceCard/DataSourceCard";

export { RepositoryCard } from "./components/RepositoryCard/RepositoryCard";
export type { RepositoryCardProps } from "./components/RepositoryCard/RepositoryCard";

export { TeamMember } from "./components/TeamMember/TeamMember";
export type { TeamMemberProps } from "./components/TeamMember/TeamMember";

export { SearchInput } from "./components/SearchInput/SearchInput";
export type { SearchInputProps } from "./components/SearchInput/SearchInput";

export { Toggle } from "./components/Toggle/Toggle";
export type { ToggleProps } from "./components/Toggle/Toggle";

// Onboarding Wizard Components
export { OnboardingWizard } from "./components/OnboardingWizard/OnboardingWizard";
export type { OnboardingWizardProps, WizardStep } from "./components/OnboardingWizard/OnboardingWizard";

export { SignupForm } from "./components/SignupForm/SignupForm";
export type { SignupFormProps, SignupFormData } from "./components/SignupForm/SignupForm";

export { SignInForm } from "./components/SignInForm/SignInForm";
export type { SignInFormProps, SignInFormData } from "./components/SignInForm/SignInForm";

export { DataSourceConfigForm } from "./components/DataSourceConfigForm/DataSourceConfigForm";
export type { DataSourceConfigFormProps, DataSourceConfig, DataSourceProvider } from "./components/DataSourceConfigForm/DataSourceConfigForm";

// TODO: Re-enable once @mmtm/resource-repository types are properly resolved
// export { RepositorySelector } from "./components/RepositorySelector/RepositorySelector";
// export type { RepositorySelectorProps } from "./components/RepositorySelector/RepositorySelector";

// Re-export Chart.js types for convenience
export type { ChartData, ChartOptions } from "chart.js";
