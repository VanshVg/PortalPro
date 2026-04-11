import Link from "next/link";
import { Card, CardContent, ProjectStatusBadge } from "@portalpro/ui";
import { Calendar, CheckSquare } from "lucide-react";

interface Props {
  project: {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    taskCount: number;
    progress: number;
    clientPortal: {
      id: string;
      name: string;
      primaryColor: string | null;
    };
  };
}

/**
 * Card component displaying a project summary with progress bar.
 */
export function ProjectCard({ project }: Props) {
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const isOverdue =
    endDate &&
    project.status !== "COMPLETED" &&
    project.status !== "ARCHIVED" &&
    endDate < new Date();

  return (
    <Link href={`/projects/${project.id}`} className="group">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          {/* Portal color tag */}
          <div
            className="h-1 w-12 rounded-full mb-4"
            style={{ backgroundColor: project.clientPortal.primaryColor ?? "#1B4D6E" }}
          />

          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-neutral-800 group-hover:text-[#1B4D6E] transition-colors leading-snug pr-2">
              {project.name}
            </h3>
            <ProjectStatusBadge status={project.status as any} />
          </div>

          {/* Client */}
          <div className="text-xs text-neutral-400 mb-4">
            {project.clientPortal.name}
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1B4D6E] transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              <span>{project.taskCount} task{project.taskCount !== 1 ? "s" : ""}</span>
            </div>
            {endDate && (
              <div
                className={[
                  "flex items-center gap-1",
                  isOverdue ? "text-red-500" : "text-neutral-400",
                ].join(" ")}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {isOverdue ? "Overdue · " : "Due "}
                  {endDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: endDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
