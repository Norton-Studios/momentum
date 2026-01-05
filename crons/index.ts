import { db } from "./db.ts";
import { startScheduler } from "./scheduler.js";

startScheduler(db);
