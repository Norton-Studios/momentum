import { commitScript } from "./commit.js";
import { contributorScript } from "./contributor.js";
import { mergeRequestScript } from "./merge-request.js";
import { repositoryScript } from "./repository.js";

export const scripts = [repositoryScript, contributorScript, commitScript, mergeRequestScript];
