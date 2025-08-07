// Re-export the repository discovery functions from the hooks module
export {
  discoverRepositories,
  getRepositoriesForTenant,
  addRepositoryToTenant,
  removeRepositoryFromTenant,
  type DiscoveredRepository,
  type RepositoryDiscoveryResult,
} from "./hooks/index.js";

// Re-export the router as default
export { default } from "./api/index.js";
