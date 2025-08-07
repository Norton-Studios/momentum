import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DataSourceConfigForm, type DataSourceProvider, type DataSourceConfig } from "./DataSourceConfigForm";

const mockProviders: DataSourceProvider[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Connect your GitHub repositories",
    icon: "🐙",
    required: true,
    fields: [
      {
        key: "token",
        label: "Personal Access Token",
        type: "password",
        placeholder: "ghp_...",
        required: true,
        help: "Generate a token with repo permissions",
      },
      {
        key: "org",
        label: "Organization",
        type: "text",
        placeholder: "your-org",
        required: true,
      },
    ],
  },
  {
    id: "jira",
    name: "JIRA",
    description: "Connect your JIRA projects",
    icon: "📋",
    required: false,
    fields: [
      {
        key: "url",
        label: "JIRA URL",
        type: "url",
        placeholder: "https://your-domain.atlassian.net",
        required: true,
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        required: true,
      },
    ],
  },
];

const mockOnConfigurationChange = vi.fn();
const mockOnTestConnection = vi.fn();

const defaultProps = {
  providers: mockProviders,
  configurations: [],
  onConfigurationChange: mockOnConfigurationChange,
  onTestConnection: mockOnTestConnection,
};

describe("DataSourceConfigForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders provider sections", () => {
    render(<DataSourceConfigForm {...defaultProps} />);

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("JIRA")).toBeInTheDocument();
    expect(screen.getByText("Connect your GitHub repositories")).toBeInTheDocument();
    expect(screen.getByText("Connect your JIRA projects")).toBeInTheDocument();
  });

  it("shows required indicator for required providers", () => {
    render(<DataSourceConfigForm {...defaultProps} />);

    expect(screen.getByText("*")).toBeInTheDocument(); // GitHub is required
  });

  it("allows adding a configuration", () => {
    render(<DataSourceConfigForm {...defaultProps} />);

    const configureButton = screen.getAllByText("Configure")[0]; // GitHub configure button
    fireEvent.click(configureButton);

    expect(mockOnConfigurationChange).toHaveBeenCalledWith([
      expect.objectContaining({
        dataSource: "github",
        name: "GitHub",
        fields: {},
      }),
    ]);
  });

  it("renders configuration card when configuration exists", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: {},
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    expect(screen.getByDisplayValue("My GitHub")).toBeInTheDocument();
    expect(screen.getAllByText("Configure")).toHaveLength(2); // One for provider, one for config card
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("expands configuration fields when configure button is clicked", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: {},
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    const configureButtons = screen.getAllByText("Configure");
    const expandButton = configureButtons.find((btn) => btn.parentElement?.className.includes("configActions"));
    fireEvent.click(expandButton!);

    expect(screen.getByLabelText(/Personal Access Token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization/i)).toBeInTheDocument();
    expect(screen.getByText("Test Connection")).toBeInTheDocument();
  });

  it("updates field values when user types", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: {},
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    // Expand the configuration
    const configureButtons = screen.getAllByText("Configure");
    const expandButton = configureButtons.find((btn) => btn.parentElement?.className.includes("configActions"));
    fireEvent.click(expandButton!);

    // Type in the token field
    const tokenField = screen.getByLabelText(/Personal Access Token/i);
    fireEvent.change(tokenField, { target: { value: "ghp_test123" } });

    expect(mockOnConfigurationChange).toHaveBeenCalledWith([
      expect.objectContaining({
        dataSource: "github",
        name: "My GitHub",
        fields: { token: "ghp_test123" },
      }),
    ]);
  });

  it("enables test connection button when required fields are filled", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: { token: "ghp_test123", org: "test-org" },
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    // Expand the configuration
    const configureButtons = screen.getAllByText("Configure");
    const expandButton = configureButtons.find((btn) => btn.parentElement?.className.includes("configActions"));
    fireEvent.click(expandButton!);

    const testButton = screen.getByText("Test Connection");
    expect(testButton).not.toBeDisabled();
  });

  it("calls onTestConnection when test button is clicked", async () => {
    mockOnTestConnection.mockResolvedValue({ success: true });

    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: { token: "ghp_test123", org: "test-org" },
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    // Expand the configuration
    const configureButtons = screen.getAllByText("Configure");
    const expandButton = configureButtons.find((btn) => btn.parentElement?.className.includes("configActions"));
    fireEvent.click(expandButton!);

    const testButton = screen.getByText("Test Connection");
    fireEvent.click(testButton);

    expect(mockOnTestConnection).toHaveBeenCalledWith(configs[0]);

    await waitFor(() => {
      expect(mockOnConfigurationChange).toHaveBeenCalledWith([
        expect.objectContaining({
          connected: true,
        }),
      ]);
    });
  });

  it("shows connection status", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: {},
        connected: true,
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    expect(screen.getByText("✓ Connected")).toBeInTheDocument();
  });

  it("shows connection error", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: {},
        error: "Invalid token",
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    expect(screen.getByText("✗ Invalid token")).toBeInTheDocument();
  });

  it("removes configuration when remove button is clicked", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: {},
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    const removeButton = screen.getByText("Remove");
    fireEvent.click(removeButton);

    expect(mockOnConfigurationChange).toHaveBeenCalledWith([]);
  });

  it("shows warning when no required VCS is connected", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "jira", // Not required
        name: "My JIRA",
        fields: {},
        connected: true,
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    expect(screen.getByText(/You must configure at least one Version Control System/i)).toBeInTheDocument();
  });

  it("shows progress indicator", () => {
    const configs: DataSourceConfig[] = [
      {
        dataSource: "github",
        name: "My GitHub",
        fields: {},
        connected: true,
      },
      {
        dataSource: "jira",
        name: "My JIRA",
        fields: {},
        connected: false,
      },
    ];

    render(<DataSourceConfigForm {...defaultProps} configurations={configs} />);

    expect(screen.getByText("1 of 2 data sources connected")).toBeInTheDocument();
  });
});
