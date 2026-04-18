import { Router } from "express";
import {
  getTimeEntriesHandler,
  postTimeEntryHandler,
  getTimeEntryHandler,
  patchTimeEntryHandler,
  deleteTimeEntryHandler,
  getTimeSummaryHandler,
} from "./time-entries.controller";

/** Project-scoped time-entry routes — mounted under /projects/:projectId/time-entries */
export const projectTimeEntryRouter = Router({ mergeParams: true });
projectTimeEntryRouter.get("/", getTimeEntriesHandler);
projectTimeEntryRouter.get("/summary", getTimeSummaryHandler);

/** Standalone time-entry routes — mounted under /time-entries */
const timeEntryRouter = Router();
timeEntryRouter.post("/", postTimeEntryHandler);
timeEntryRouter.get("/:entryId", getTimeEntryHandler);
timeEntryRouter.patch("/:entryId", patchTimeEntryHandler);
timeEntryRouter.delete("/:entryId", deleteTimeEntryHandler);

export default timeEntryRouter;
