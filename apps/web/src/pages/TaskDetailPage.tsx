/**
 * Task detail page showing task information, assignment status, and input data.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileText, User, AlertCircle } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskDetail {
  task_id: string;
  project_id: string;
  project_name: string;
  status: string;
  priority: number;
  input_data: unknown;
  workflow_state: {
    current_step_id: string | null;
    step_states: Array<{ step_id: string; status: string }>;
  };
  created_at: string;
  assignment?: {
    assignment_id: string;
    status: string;
    assigned_at: string;
    step_id: string;
  };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    accepted: "bg-blue-100 text-blue-800",
    assigned: "bg-purple-100 text-purple-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const colors: Record<number, string> = {
    1: "bg-gray-100 text-gray-600",
    2: "bg-blue-100 text-blue-600",
    3: "bg-yellow-100 text-yellow-600",
    4: "bg-orange-100 text-orange-600",
    5: "bg-red-100 text-red-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[priority] ?? colors[1]}`}
    >
      P{priority}
    </span>
  );
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();

  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api.get<TaskDetail>(`/tasks/${taskId}`),
    enabled: !!taskId,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/queue">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Task Not Found</h1>
        </div>
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>The requested task could not be found or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/queue">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Task Details</h1>
          <p className="text-sm text-muted-foreground">{task.project_name}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Task Info Card */}
        <div className="bg-card border rounded-lg">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-foreground">Task Information</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Task ID</p>
                <p className="text-sm font-mono">{task.task_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">
                  {new Date(task.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 text-center text-muted-foreground text-sm">
                !
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Card */}
        {task.assignment ? (
          <div className="bg-card border rounded-lg">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-foreground">Your Assignment</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Step</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                    {task.assignment.step_id}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <StatusBadge status={task.assignment.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned</p>
                <p className="text-sm">
                  {new Date(task.assignment.assigned_at).toLocaleString()}
                </p>
              </div>
              {task.assignment.status === "accepted" && (
                <Link to={`/annotate/${task.task_id}`}>
                  <Button className="w-full mt-2">Start Annotation</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-lg">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-foreground">Assignment</h2>
            </div>
            <div className="p-4 text-muted-foreground text-sm">
              No active assignment for this task.
            </div>
          </div>
        )}
      </div>

      {/* Input Data Card */}
      <div className="bg-card border rounded-lg">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-foreground">Input Data</h2>
        </div>
        <div className="p-4">
          <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono max-h-96">
            {JSON.stringify(task.input_data, null, 2)}
          </pre>
        </div>
      </div>

      {/* Workflow State */}
      {task.workflow_state?.step_states &&
        task.workflow_state.step_states.length > 0 && (
          <div className="bg-card border rounded-lg">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-foreground">Workflow Progress</h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {task.workflow_state.step_states.map((step) => (
                  <div
                    key={step.step_id}
                    className={`px-3 py-2 rounded border text-sm ${
                      step.step_id === task.workflow_state?.current_step_id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <p className="font-medium">{step.step_id}</p>
                    <StatusBadge status={step.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
