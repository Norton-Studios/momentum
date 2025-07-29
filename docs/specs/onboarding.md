# Momentum Onboarding Specification

## Overview

This document specifies the onboarding process for new users and organizations in the Momentum platform. The onboarding flow is designed as a wizard-based experience that guides users through account creation, data source configuration, and initial team setup.

## Goals

- Create a streamlined, intuitive onboarding experience
- Ensure users configure at least one VCS data source
- Enable automatic repository discovery and team organization
- Provide immediate value by starting data collection upon completion
- Allow users to resume incomplete onboarding sessions

## User Flow

### 1. Sign Up

Users can create an account through multiple methods:

#### 1.1 Email/Password Registration
- **Fields:**
  - Full Name (required)
  - Email Address (required, validated for format)
  - Password (required)
  - Organization Name (required, must be unique)
- **Password Requirements:**
  - Minimum 12 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Validation:**
  - Organization name uniqueness check
  - Email format validation
  - Real-time password strength indicator

#### 1.2 SSO Registration
- **Supported Providers:**
  - GitHub OAuth
  - Google OAuth
  - GitLab OAuth
- **Flow:**
  - User selects SSO provider
  - Redirected to provider for authentication
  - Returns with profile information pre-filled
  - User must still provide Organization Name
- **Data Mapping:**
  - Name: From provider profile
  - Email: From provider profile
  - Password: Not required for SSO users

#### 1.3 Account Creation Process
- Creates tenant record with provided organization name
- Creates user record with admin privileges
- For email/password: Stores bcrypt-hashed password
- For SSO: Stores provider and provider user ID
- Generates API token for programmatic access
- Automatically logs user in after creation

### 2. Data Source Configuration

After account creation, users enter the data source configuration wizard.

#### 2.1 VCS Configuration (Required)
At least one VCS source must be configured to proceed.

**Supported VCS Providers:**
- GitHub
- GitLab  
- Bitbucket

**Configuration Fields (example for GitHub):**
- Personal Access Token (required)
- Organization Name(s) (required)
- Repository visibility (all/public/private)

**Multiple Instances:**
- Users can add multiple instances of the same provider
- Each instance is identified as: `{provider}/{org-name}` (e.g., "GitHub/Norton-Studios")
- Stored in TenantDataSourceConfig with:
  - `data_source`: "github"
  - `instance_id`: "Norton-Studios"
  - Configuration stored as key-value pairs

**Connection Validation:**
- Test authentication upon configuration
- Display success/error message
- Do not proceed until at least one VCS is successfully configured

#### 2.2 CI/CD Configuration (Optional)
**Supported Providers:**
- Jenkins
- CircleCI
- Travis CI
- GitHub Actions (auto-configured with GitHub VCS)
- GitLab CI (auto-configured with GitLab VCS)

#### 2.3 Project Management Configuration (Optional)
**Supported Providers:**
- JIRA
- Trello
- Asana

#### 2.4 Code Quality Configuration (Optional)
**Supported Providers:**
- SonarQube
- CodeClimate

#### 2.5 Cloud Hosting Configuration (Optional)
**Supported Providers:**
- AWS
- Azure
- Google Cloud Platform

#### 2.6 Communication Tools (Optional)
**Supported Providers:**
- Slack
- Microsoft Teams

### 3. Team Setup

After configuring data sources, users organize their repositories into teams.

#### 3.1 Repository Discovery
- Automatically fetch all repositories from configured VCS sources
- Display repositories grouped by source (e.g., "GitHub/Norton-Studios")
- Show repository metadata: name, description, primary language, last activity

#### 3.2 Team Creation
**Fields:**
- Team Name (required)
- Description (optional)
- Team Lead (optional, select from discovered contributors)

#### 3.3 Repository Assignment
Three methods for assigning repositories to teams:

**Regex-Based Mapping:**
- User provides regex pattern
- System shows live preview of matching repositories
- Common templates provided:
  - Frontend: `^(frontend|ui|web)-.*`
  - Backend: `^(api|backend|service)-.*`
  - Mobile: `^(ios|android|mobile)-.*`

**Label-Based Mapping:**
- System detects available labels from VCS:
  - GitHub: Topics
  - GitLab: Tags
  - Bitbucket: Labels
- User selects labels to match
- Repositories with selected labels auto-assigned to team

**Bulk Operations:**
- Select all/none buttons
- Filter by language, activity, or name
- Drag-and-drop for moving between teams

#### 3.4 Unassigned Repositories
- Repositories not assigned to any team go to "Unassigned" team
- Users can reassign repositories post-onboarding

### 4. Review and Complete

#### 4.1 Summary Screen
Display configuration summary:
- Organization details
- Configured data sources
- Created teams with repository counts
- Estimated time for initial data collection

#### 4.2 Initial Data Collection
- Automatically triggered upon completion
- Imports all repositories from VCS sources
- Creates repository records with team associations
- No historical data imported during onboarding (just current state)

#### 4.3 Completion Actions
- Mark tenant as onboarded
- Redirect to main dashboard
- Show "Getting Started" guide

## Technical Implementation

### Database Schema Updates

```prisma
model TenantDataSourceConfig {
  id           String   @id @default(cuid())
  tenantId     String   @map("tenant_id")
  dataSource   String   @map("data_source")
  instanceId   String?  @map("instance_id")  // For multiple instances
  key          String
  value        String
  createdAt    DateTime @default(now()) @map("created_at")
  
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, dataSource, instanceId, key])
  @@map("tenant_data_source_config")
}

model OnboardingProgress {
  id              String   @id @default(cuid())
  tenantId        String   @unique @map("tenant_id")
  currentStep     String   @map("current_step")
  completedSteps  Json     @map("completed_steps")
  wizardData      Json     @map("wizard_data")
  completed       Boolean  @default(false)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("onboarding_progress")
}
```

### Plugin Architecture for Onboarding

The onboarding functionality is implemented through resource plugins that expose both API endpoints and reusable functions for Remix actions.

#### Tenant Resource Plugin
**Location:** `plugins/resources/tenant/`

```typescript
// plugins/resources/tenant/api/index.ts
export const router = Router();

// API endpoint for tenant creation
router.post('/tenant', validateSystemAdmin, async (req, res) => {
  const result = await createTenant(req.body);
  res.json(result);
});

// Reusable function for Remix actions
export async function createTenant(data: CreateTenantInput) {
  // Validate organization uniqueness
  // Create tenant and admin user
  // Return tenant details and generated password
}

// Validate organization name uniqueness
export async function validateOrganizationName(name: string) {
  // Check if organization name exists
}
```

#### User Resource Plugin  
**Location:** `plugins/resources/user/`

```typescript
// plugins/resources/user/api/index.ts
export const router = Router();

// SSO-related endpoints
router.get('/auth/sso/:provider', initiateSSOFlow);
router.get('/auth/sso/:provider/callback', handleSSOCallback);

// Reusable authentication functions
export async function createUser(tenantId: string, userData: CreateUserInput) {
  // Create user with email/password or SSO
}

export async function authenticateUser(email: string, password: string) {
  // Validate credentials and return user with tenant
}
```

#### Tenant Data Source Config Resource Plugin
**Location:** `plugins/resources/tenant-data-source-config/`

```typescript
// plugins/resources/tenant-data-source-config/api/index.ts
export const router = Router();

// API endpoints
router.post('/data-sources/test', authenticate, testDataSourceConnection);
router.get('/data-sources', authenticate, getDataSources);
router.post('/data-sources', authenticate, saveDataSource);

// Reusable functions for Remix
export async function testConnection(config: DataSourceConfig) {
  // Test the connection
}

export async function saveDataSourceConfig(
  tenantId: string, 
  configs: DataSourceConfig[]
) {
  // Save to TenantDataSourceConfig
}

export async function discoverRepositories(tenantId: string) {
  // Fetch repositories from all configured VCS sources
}
```

#### Tenant Resource Plugin (Extended)
The tenant resource also manages onboarding progress:

```typescript
// plugins/resources/tenant/api/index.ts (continued)

// Onboarding progress functions
export async function getOnboardingProgress(tenantId: string) {
  // Retrieve saved progress from OnboardingProgress table
}

export async function updateOnboardingProgress(
  tenantId: string, 
  step: string, 
  data: any
) {
  // Update progress and wizard data
}

export async function completeOnboarding(tenantId: string) {
  // Mark as complete and trigger initial imports
}

// API endpoints for onboarding progress
router.get('/tenant/:id/onboarding', authenticate, async (req, res) => {
  const progress = await getOnboardingProgress(req.params.id);
  res.json(progress);
});

router.put('/tenant/:id/onboarding', authenticate, async (req, res) => {
  const result = await updateOnboardingProgress(
    req.params.id,
    req.body.step,
    req.body.data
  );
  res.json(result);
});
```

### Remix Routes Using Plugin Functions

```typescript
// apps/frontend/app/routes/auth/signup.tsx
import { createTenant, validateOrganizationName } from '@mmtm/resource-tenant';
import { createUser } from '@mmtm/resource-user';

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  
  // Use plugin functions directly
  const tenant = await createTenant({
    organizationName: formData.get('organization'),
    adminEmail: formData.get('email'),
    // ...
  });
  
  return redirect('/onboarding/data-sources');
}

// apps/frontend/app/routes/onboarding/data-sources.tsx
import { saveDataSourceConfig, testConnection } from '@mmtm/resource-tenant-data-source-config';
import { updateOnboardingProgress } from '@mmtm/resource-tenant';

export async function action({ request }: ActionArgs) {
  const { tenantId } = await requireAuth(request);
  const formData = await request.formData();
  
  if (formData.get('_action') === 'test') {
    return json(await testConnection(JSON.parse(formData.get('config'))));
  }
  
  await saveDataSourceConfig(tenantId, configs);
  await updateOnboardingProgress(tenantId, 'data-sources', configs);
  
  return redirect('/onboarding/teams');
}
```

### Benefits of This Approach

1. **Reusability**: Functions can be used by both API endpoints and Remix actions
2. **Consistency**: Same business logic whether accessed via API or web UI
3. **Modularity**: Each resource plugin is self-contained
4. **Type Safety**: Shared TypeScript types between API and UI
5. **Testing**: Business logic can be tested independently of transport layer

### State Management

- Wizard progress saved to database after each step
- Allows resuming from any point
- Expired sessions return to last saved step
- Frontend maintains local state synchronized with backend

## UX Considerations

### Progress Indication
- Step indicator showing current position
- Completed steps marked with checkmarks
- Estimated time remaining

### Validation and Feedback
- Real-time validation for all inputs
- Clear error messages with remediation steps
- Success confirmations for completed actions
- Loading states during API calls

### Help and Documentation
- Contextual help for each configuration field
- Links to generate API tokens for each service
- Example patterns for regex matching
- Video tutorials for complex steps

## Post-Onboarding

### Organization Settings
Users can modify all configurations in Organization Settings:
- Add/remove data sources
- Update credentials
- Create new teams
- Reassign repositories
- Manage user access

### Dashboard
Post-onboarding dashboard shows:
- Data collection progress
- Repository import status  
- Initial metrics as they become available
- Suggested next steps

## Security Considerations

- All credentials stored encrypted in database
- API tokens never exposed in frontend
- SSO tokens refreshed automatically
- Audit log for all configuration changes
- Rate limiting on validation endpoints

## Future Enhancements

- Bulk import from configuration file
- Template-based team creation
- Auto-detection of repository relationships
- Onboarding analytics to optimize flow
- Integration marketplace for additional data sources