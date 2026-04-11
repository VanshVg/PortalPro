import type { Request, Response, NextFunction } from "express";
import { createProjectSchema, updateProjectSchema } from "@portalpro/types";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
} from "./projects.service";
import { logger } from "../../lib/logger";

/**
 * GET /api/v1/projects
 * Query param: ?portalId=<id> (optional)
 */
export async function getProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const portalId = req.query["portalId"] as string | undefined;
    const projects = await listProjects(req.tenantId!, portalId);
    res.json({ data: projects });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/projects/:projectId
 */
export async function getProjectById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params["projectId"] as string;
    const project = await getProject(req.tenantId!, projectId);
    res.json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/projects
 */
export async function postProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createProjectSchema.parse(req.body);
    const project = await createProject(req.tenantId!, input);
    logger.info({ tenantId: req.tenantId, projectId: project.id }, "Project created");
    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/projects/:projectId
 */
export async function patchProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params["projectId"] as string;
    const input = updateProjectSchema.parse(req.body);
    const project = await updateProject(req.tenantId!, projectId, input);
    logger.info({ tenantId: req.tenantId, projectId }, "Project updated");
    res.json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/projects/:projectId
 * Soft-deletes (archives) the project.
 */
export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params["projectId"] as string;
    await archiveProject(req.tenantId!, projectId, req.user!.id);
    logger.info({ tenantId: req.tenantId, projectId }, "Project archived");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
