/**
 * WorkflowTester - Main container for workflow testing mode.
 * Provides split view with canvas highlighting and test execution.
 */
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, Play, Square, RefreshCw } from "lucide-react";
import { TestDataSelector } from "./TestDataSelector";
import { StepExecutor } from "./StepExecutor";
import { TestResultsPanel } from "./TestResultsPanel";
import { useWorkflowTest } from "../hooks/useWorkflowTest";
import { useCanvasStore } from "../stores/canvasStore";
import type { JSONSchema7 } from "json-schema";

// =============================================================================
// Types
// =============================================================================

interface WorkflowTesterProps {
  inputSchema?: JSONSchema7;
  dataSourceSample?: Record<string, unknown>[];
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function WorkflowTester({
  inputSchema,
  dataSourceSample = [],
  onClose,
}: WorkflowTesterProps) {
  const { selectNode } = useCanvasStore();
  const {
    testState,
    isTestMode,
    currentStep,
    startTest,
    stopTest,
    pauseTest,
    resumeTest,
    setTestData,
    submitStepResult,
    skipStep,
    reset,
    getStepInput,
  } = useWorkflowTest();

  // Handle data selection
  const handleDataSelect = useCallback(
    (data: Record<string, unknown>) => {
      setTestData(data);
      startTest(data);
    },
    [setTestData, startTest],
  );

  // Handle cancel data selection
  const handleCancelDataSelect = useCallback(() => {
    reset();
  }, [reset]);

  // Handle step click in results panel
  const handleStepClick = useCallback(
    (stepId: string) => {
      selectNode(stepId);
    },
    [selectNode],
  );

  // Get current step input
  const currentStepInput = useMemo(() => {
    if (!currentStep) return {};
    return getStepInput(currentStep.id);
  }, [currentStep, getStepInput]);

  // Status message
  const statusMessage = useMemo(() => {
    switch (testState.status) {
      case "idle":
        return "Click 'Start Test' to begin";
      case "selecting_data":
        return "Select test data to continue";
      case "running":
        return `Testing: ${currentStep?.data.label || "Unknown step"}`;
      case "paused":
        return "Test paused";
      case "completed":
        return "Test completed";
      case "error":
        return `Error: ${testState.error}`;
      default:
        return "";
    }
  }, [testState.status, testState.error, currentStep]);

  return (
    <div className="flex h-full flex-col">
      {/* Test Mode Banner */}
      <div className="flex items-center justify-between border-b bg-yellow-50 px-4 py-2 dark:bg-yellow-950/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            TEST MODE
          </span>
          <span className="text-sm text-yellow-600 dark:text-yellow-400">
            — {statusMessage}
          </span>
          {testState.status !== "idle" && (
            <Badge
              variant={
                testState.status === "completed"
                  ? "default"
                  : testState.status === "error"
                    ? "destructive"
                    : "secondary"
              }
            >
              {testState.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {testState.status === "idle" && (
            <Button size="sm" onClick={() => startTest()}>
              <Play className="mr-2 h-3 w-3" />
              Start Test
            </Button>
          )}
          {testState.status === "running" && (
            <Button size="sm" variant="outline" onClick={pauseTest}>
              <Square className="mr-2 h-3 w-3" />
              Pause
            </Button>
          )}
          {testState.status === "paused" && (
            <Button size="sm" onClick={resumeTest}>
              <Play className="mr-2 h-3 w-3" />
              Resume
            </Button>
          )}
          {(testState.status === "completed" ||
            testState.status === "error") && (
            <Button size="sm" variant="outline" onClick={reset}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Reset
            </Button>
          )}
          {isTestMode && (
            <Button size="sm" variant="ghost" onClick={stopTest}>
              Stop
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Step Executor or Data Selector */}
        <div className="flex-1 overflow-auto p-4">
          {testState.status === "selecting_data" && (
            <div className="flex items-center justify-center h-full">
              <TestDataSelector
                inputSchema={inputSchema}
                dataSourceSample={dataSourceSample}
                onSelect={handleDataSelect}
                onCancel={handleCancelDataSelect}
              />
            </div>
          )}

          {testState.status === "running" && currentStep && (
            <StepExecutor
              step={currentStep}
              stepInput={currentStepInput}
              onSubmit={submitStepResult}
              onSkip={skipStep}
              onPause={pauseTest}
              isPaused={false}
            />
          )}

          {testState.status === "paused" && currentStep && (
            <StepExecutor
              step={currentStep}
              stepInput={currentStepInput}
              onSubmit={submitStepResult}
              onSkip={skipStep}
              onPause={resumeTest}
              isPaused={true}
            />
          )}

          {testState.status === "completed" && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 rounded-full bg-green-100 p-4 inline-block dark:bg-green-900/30">
                  <Play className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Test Completed</h3>
                <p className="text-muted-foreground mt-1">
                  {testState.stepResults.size} steps executed
                </p>
                <Button className="mt-4" onClick={reset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Another Test
                </Button>
              </div>
            </div>
          )}

          {testState.status === "error" && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 rounded-full bg-red-100 p-4 inline-block dark:bg-red-900/30">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Test Error</h3>
                <p className="text-destructive mt-1">{testState.error}</p>
                <Button className="mt-4" variant="outline" onClick={reset}>
                  Reset
                </Button>
              </div>
            </div>
          )}

          {testState.status === "idle" && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mb-4 rounded-full bg-muted p-4 inline-block">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Test Your Workflow</h3>
                <p className="text-muted-foreground mt-2">
                  Run through your workflow with test data to verify it works
                  correctly. Results are ephemeral and won't be saved.
                </p>
                <Button className="mt-4" onClick={() => startTest()}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Test
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Results Panel */}
        {isTestMode && (
          <div className="w-80 border-l bg-muted/30">
            <TestResultsPanel
              testState={testState}
              onStepClick={handleStepClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
