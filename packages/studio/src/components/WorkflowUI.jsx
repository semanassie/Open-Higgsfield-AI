"use client";

import React, { useEffect } from "react";
import { WorkflowBuilder, registerLocalRunAdapter } from "workflow-builder";
import "reactflow/dist/style.css";
import "react-toastify/dist/ReactToastify.css";
import {
  runLocalDefaultChain,
  runLocalImageNode,
  runLocalVideoNode,
  runLocalAudioNode,
  localSucceededRecord,
} from "../lib/workflowLocalAdapter.js";


const WorkflowUI = ({ workflowId, initialNodeSchemas, initialWorkflowData, apiKey }) => {
  useEffect(() => {
    sessionStorage.setItem("fromWorkflowBuilder", "true");
  }, []);

  // Register studio muapi as the default Run All / Image / Video / Audio path
  useEffect(() => {
    if (!apiKey) {
      registerLocalRunAdapter(null);
      return () => registerLocalRunAdapter(null);
    }
    registerLocalRunAdapter({
      apiKey,
      runDefaultChain: runLocalDefaultChain,
      runImageNode: runLocalImageNode,
      runVideoNode: runLocalVideoNode,
      runAudioNode: runLocalAudioNode,
      succeededRecord: localSucceededRecord,
    });
    return () => registerLocalRunAdapter(null);
  }, [apiKey]);

  return (
    <div className="w-full h-full bg-black">
      <WorkflowBuilder 
        workflowId={workflowId}
        initialNodeSchemas={initialNodeSchemas} 
        initialWorkflowData={initialWorkflowData}
        costType="dollars" 
      />
    </div>
  );
};

export default WorkflowUI;
