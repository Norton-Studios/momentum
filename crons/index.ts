import { PrismaClient } from "@prisma/client";
import { startScheduler } from "./scheduler.js";

const db = new PrismaClient();
startScheduler(db);
