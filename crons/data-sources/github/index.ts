import { commitScript } from "./commit.js";
import { contributorScript } from "./contributor.js";
import { issueScript } from "./issue.js";
import { pipelineScript } from "./pipeline.js";
import { pipelineRunScript } from "./pipeline-run.js";
import { projectScript } from "./project.js";
import { pullRequestScript } from "./pull-request.js";
import { repositoryScript } from "./repository.js";

export const scripts = [repositoryScript, contributorScript, commitScript, pullRequestScript, projectScript, issueScript, pipelineScript, pipelineRunScript];
