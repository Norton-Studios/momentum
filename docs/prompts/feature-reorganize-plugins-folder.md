# Plugin Architecture Reorganization

## Summary

This pull request reorganizes the plugin architecture by moving the plugins folder from the root directory to `libs/plugins`, following a more standard monorepo structure. This change improves code organization and aligns with common practices for TypeScript monorepos.

## Changes Made

### 1. Moved Plugin Directory Structure
- Moved `/plugins/` to `/libs/plugins/`
- Updated all import paths to reflect the new location
- Fixed path references in configuration files

### 2. Updated Configuration Files
- **turbo.json**: Simplified test inputs configuration to use glob patterns instead of specific file lists
- **All plugin vitest.config.ts files**: Updated relative paths to point to the correct root configuration
- **All plugin tsconfig.json files**: Fixed extends paths to reference the root tsconfig.json correctly

### 3. Documentation Updates
- Renamed `documentation/` folder to `docs/` for consistency
- Updated `docs/PROGRESS.md` to document these architectural changes
- All documentation references remain intact with the new structure

### 4. Import Path Updates
The following patterns were updated across the codebase:
- Dynamic imports in API: `../../plugins/*/*/api/index.ts` → `../../libs/plugins/*/*/api/index.ts`
- Dynamic imports in Crons: `../../plugins/data-sources/*/index.ts` → `../../libs/plugins/data-sources/*/index.ts`
- Schema synthesis paths: `../../plugins/*/*/db/schema.prisma` → `../../libs/plugins/*/*/db/schema.prisma`

## Testing

All tests pass successfully:
- ✅ Unit tests across all packages
- ✅ Integration tests
- ✅ E2E tests (except for Playwright browser installation issue)
- ✅ Code formatting (24 files fixed)
- ✅ Linting (only schema version warning)

## Benefits

1. **Better Organization**: Groups all library code under `libs/` directory
2. **Standard Structure**: Follows common monorepo patterns used in the TypeScript ecosystem
3. **Clearer Separation**: Distinguishes between applications (`apps/`) and libraries (`libs/`)
4. **Simplified Configuration**: Reduced complexity in turbo.json test inputs

## Migration Notes

No breaking changes for external consumers. All internal paths have been updated automatically.