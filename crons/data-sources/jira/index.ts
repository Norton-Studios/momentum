import { boardScript } from "./board.js";
import { issueScript } from "./issue.js";
import { projectScript } from "./project.js";
import { sprintScript } from "./sprint.js";
import { statusTransitionScript } from "./status-transition.js";

export const scripts = [projectScript, boardScript, sprintScript, issueScript, statusTransitionScript];
