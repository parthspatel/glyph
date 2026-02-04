/**
 * Node type registry for React Flow.
 */
import type { NodeTypes } from "@xyflow/react";
import { StartNode } from "./StartNode";
import { EndNode } from "./EndNode";
import { AnnotationNode } from "./AnnotationNode";
import { ReviewNode } from "./ReviewNode";
import { AdjudicationNode } from "./AdjudicationNode";
import { AutoProcessNode } from "./AutoProcessNode";
import { ConditionNode } from "./ConditionNode";
import { ForkNode } from "./ForkNode";
import { JoinNode } from "./JoinNode";
import { SubWorkflowNode } from "./SubWorkflowNode";

export const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  annotation: AnnotationNode,
  review: ReviewNode,
  adjudication: AdjudicationNode,
  auto_process: AutoProcessNode,
  conditional: ConditionNode,
  fork: ForkNode,
  join: JoinNode,
  sub_workflow: SubWorkflowNode,
};

export {
  StartNode,
  EndNode,
  AnnotationNode,
  ReviewNode,
  AdjudicationNode,
  AutoProcessNode,
  ConditionNode,
  ForkNode,
  JoinNode,
  SubWorkflowNode,
};
