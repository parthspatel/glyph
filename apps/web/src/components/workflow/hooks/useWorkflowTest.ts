/**
 * Hook for workflow test execution.
 * Manages test mode state, step-through execution, and ephemeral results.
 */
import { useState, useCallback, useMemo } from "react";
import { useCanvasStore } from "../stores/canvasStore";
import type { WorkflowNode, WorkflowEdge } from "../types";

// =============================================================================
// Types
// =============================================================================

export type TestStatus =
  | "idle"
  | "selecting_data"
  | "running"
  | "paused"
  | "completed"
  | "error";

export interface StepResult {
  stepId: string;
  stepName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  skipped: boolean;
  error?: string;
}

export interface TestState {
  status: TestStatus;
  testData: Record<string, unknown> | null;
  currentStepId: string | null;
  stepResults: Map<string, StepResult>;
  executionPath: string[];
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

export interface UseWorkflowTestReturn {
  // State
  testState: TestState;
  isTestMode: boolean;
  currentStep: WorkflowNode | null;
  completedSteps: string[];

  // Actions
  startTest: (data?: Record<string, unknown>) => void;
  stopTest: () => void;
  pauseTest: () => void;
  resumeTest: () => void;
  setTestData: (data: Record<string, unknown>) => void;
  submitStepResult: (output: Record<string, unknown>) => void;
  skipStep: () => void;
  advanceToStep: (stepId: string) => void;
  reset: () => void;

  // Utilities
  getStepInput: (stepId: string) => Record<string, unknown>;
  canAdvance: () => boolean;
  getNextSteps: () => WorkflowNode[];
}

// =============================================================================
// Initial State
// =============================================================================

const initialTestState: TestState = {
  status: "idle",
  testData: null,
  currentStepId: null,
  stepResults: new Map(),
  executionPath: [],
  startedAt: null,
  completedAt: null,
  error: null,
};

// =============================================================================
// Hook
// =============================================================================

export function useWorkflowTest(): UseWorkflowTestReturn {
  const { nodes, edges, selectNode } = useCanvasStore();
  const [testState, setTestState] = useState<TestState>(initialTestState);

  // Find start node
  const startNode = useMemo(
    () => nodes.find((n) => n.data.stepType === "start"),
    [nodes],
  );

  // Find end nodes
  const endNodes = useMemo(
    () => nodes.filter((n) => n.data.stepType === "end"),
    [nodes],
  );

  // Get current step node
  const currentStep = useMemo(() => {
    if (!testState.currentStepId) return null;
    return nodes.find((n) => n.id === testState.currentStepId) || null;
  }, [nodes, testState.currentStepId]);

  // Get completed step IDs
  const completedSteps = useMemo(
    () =>
      Array.from(testState.stepResults.keys()).filter(
        (id) => testState.stepResults.get(id)?.completedAt,
      ),
    [testState.stepResults],
  );

  // Check if currently in test mode
  const isTestMode = testState.status !== "idle";

  // Get outgoing edges from a node
  const getOutgoingEdges = useCallback(
    (nodeId: string): WorkflowEdge[] => {
      return edges.filter((e) => e.source === nodeId);
    },
    [edges],
  );

  // Get next possible steps from current step
  const getNextSteps = useCallback((): WorkflowNode[] => {
    if (!testState.currentStepId) return [];
    const outgoing = getOutgoingEdges(testState.currentStepId);
    return outgoing
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is WorkflowNode => n !== undefined);
  }, [testState.currentStepId, getOutgoingEdges, nodes]);

  // Compute step input from test data and previous results
  const getStepInput = useCallback(
    (_stepId: string): Record<string, unknown> => {
      const baseInput: Record<string, unknown> = {
        input: testState.testData || {},
      };

      // Add outputs from completed steps
      const stepsOutput: Record<string, Record<string, unknown>> = {};
      testState.stepResults.forEach((result, id) => {
        if (result.completedAt && !result.skipped) {
          stepsOutput[id] = result.output;
        }
      });
      baseInput.steps = stepsOutput;

      // Add task metadata
      baseInput.task = {
        id: `test-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      // Add user info
      baseInput.user = {
        id: "test-user",
        name: "Test User",
      };

      return baseInput;
    },
    [testState.testData, testState.stepResults],
  );

  // Check if we can advance to next step
  const canAdvance = useCallback((): boolean => {
    if (testState.status !== "running") return false;
    if (!testState.currentStepId) return false;
    return getNextSteps().length > 0;
  }, [testState.status, testState.currentStepId, getNextSteps]);

  // Start the test
  const startTest = useCallback(
    (data?: Record<string, unknown>) => {
      if (!startNode) {
        setTestState((prev) => ({
          ...prev,
          status: "error",
          error: "No start node found in workflow",
        }));
        return;
      }

      const testData = data || testState.testData;
      if (!testData) {
        // Need to select data first
        setTestState((prev) => ({
          ...prev,
          status: "selecting_data",
        }));
        return;
      }

      // Find first step after start
      const outgoing = getOutgoingEdges(startNode.id);
      const firstStep =
        outgoing.length > 0
          ? nodes.find((n) => n.id === outgoing[0].target)
          : null;

      if (!firstStep) {
        setTestState((prev) => ({
          ...prev,
          status: "error",
          error: "No steps connected to start node",
        }));
        return;
      }

      setTestState({
        status: "running",
        testData,
        currentStepId: firstStep.id,
        stepResults: new Map(),
        executionPath: [startNode.id, firstStep.id],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      });

      // Highlight current step on canvas
      selectNode(firstStep.id);
    },
    [startNode, testState.testData, getOutgoingEdges, nodes, selectNode],
  );

  // Stop the test
  const stopTest = useCallback(() => {
    setTestState(initialTestState);
    selectNode(null);
  }, [selectNode]);

  // Pause the test
  const pauseTest = useCallback(() => {
    setTestState((prev) => ({
      ...prev,
      status: prev.status === "running" ? "paused" : prev.status,
    }));
  }, []);

  // Resume the test
  const resumeTest = useCallback(() => {
    setTestState((prev) => ({
      ...prev,
      status: prev.status === "paused" ? "running" : prev.status,
    }));
  }, []);

  // Set test data
  const setTestData = useCallback((data: Record<string, unknown>) => {
    setTestState((prev) => ({
      ...prev,
      testData: data,
    }));
  }, []);

  // Submit result for current step and advance
  const submitStepResult = useCallback(
    (output: Record<string, unknown>) => {
      if (!testState.currentStepId || testState.status !== "running") return;

      const stepNode = currentStep;
      if (!stepNode) return;

      // Record the result
      const result: StepResult = {
        stepId: testState.currentStepId,
        stepName: stepNode.data.label || testState.currentStepId,
        input: getStepInput(testState.currentStepId),
        output,
        startedAt: new Date(),
        completedAt: new Date(),
        skipped: false,
      };

      const newResults = new Map(testState.stepResults);
      newResults.set(testState.currentStepId, result);

      // Determine next step
      const nextSteps = getNextSteps();

      // Check if we've reached an end node
      const isEndNode = endNodes.some((n) => n.id === testState.currentStepId);
      if (isEndNode || nextSteps.length === 0) {
        setTestState((prev) => ({
          ...prev,
          stepResults: newResults,
          status: "completed",
          completedAt: new Date(),
        }));
        return;
      }

      // For now, take the first path (condition evaluation would go here)
      const nextStep = nextSteps[0];

      // Check if next step is an end node
      if (endNodes.some((n) => n.id === nextStep.id)) {
        setTestState((prev) => ({
          ...prev,
          stepResults: newResults,
          currentStepId: nextStep.id,
          executionPath: [...prev.executionPath, nextStep.id],
          status: "completed",
          completedAt: new Date(),
        }));
        selectNode(nextStep.id);
        return;
      }

      setTestState((prev) => ({
        ...prev,
        stepResults: newResults,
        currentStepId: nextStep.id,
        executionPath: [...prev.executionPath, nextStep.id],
      }));

      selectNode(nextStep.id);
    },
    [testState, currentStep, getStepInput, getNextSteps, endNodes, selectNode],
  );

  // Skip current step
  const skipStep = useCallback(() => {
    if (!testState.currentStepId || testState.status !== "running") return;

    const stepNode = currentStep;
    if (!stepNode) return;

    // Record skipped result
    const result: StepResult = {
      stepId: testState.currentStepId,
      stepName: stepNode.data.label || testState.currentStepId,
      input: getStepInput(testState.currentStepId),
      output: {},
      startedAt: new Date(),
      completedAt: new Date(),
      skipped: true,
    };

    const newResults = new Map(testState.stepResults);
    newResults.set(testState.currentStepId, result);

    // Move to next step
    const nextSteps = getNextSteps();
    if (nextSteps.length === 0) {
      setTestState((prev) => ({
        ...prev,
        stepResults: newResults,
        status: "completed",
        completedAt: new Date(),
      }));
      return;
    }

    const nextStep = nextSteps[0];
    setTestState((prev) => ({
      ...prev,
      stepResults: newResults,
      currentStepId: nextStep.id,
      executionPath: [...prev.executionPath, nextStep.id],
    }));

    selectNode(nextStep.id);
  }, [testState, currentStep, getStepInput, getNextSteps, selectNode]);

  // Advance to specific step (for "test from here" feature)
  const advanceToStep = useCallback(
    (stepId: string) => {
      const node = nodes.find((n) => n.id === stepId);
      if (!node) return;

      if (testState.status === "idle") {
        // Start test from this step
        setTestState((prev) => ({
          ...prev,
          status: "selecting_data",
          currentStepId: stepId,
        }));
      } else {
        setTestState((prev) => ({
          ...prev,
          currentStepId: stepId,
          executionPath: [...prev.executionPath, stepId],
        }));
        selectNode(stepId);
      }
    },
    [nodes, testState.status, selectNode],
  );

  // Reset to initial state
  const reset = useCallback(() => {
    setTestState(initialTestState);
    selectNode(null);
  }, [selectNode]);

  return {
    testState,
    isTestMode,
    currentStep,
    completedSteps,
    startTest,
    stopTest,
    pauseTest,
    resumeTest,
    setTestData,
    submitStepResult,
    skipStep,
    advanceToStep,
    reset,
    getStepInput,
    canAdvance,
    getNextSteps,
  };
}
