import { jsonSchema, type ToolSet } from "ai";

import type { ToolJSONSchema, ToolModelContentPart } from "./index";

/** Frontend tool definitions uploaded by AssistantChatTransport. */
export type FrontendTools = Record<string, ToolJSONSchema>;

type ModelContentEnvelope<TResult = unknown> = {
  readonly __aui_modelContent: readonly ToolModelContentPart[];
  readonly value: TResult;
};

function isModelContentEnvelope<TResult = unknown>(
  value: TResult | ModelContentEnvelope<TResult>,
): value is ModelContentEnvelope<TResult> {
  return (
    value != null &&
    typeof value === "object" &&
    "__aui_modelContent" in value &&
    Array.isArray((value as Record<string, unknown>).__aui_modelContent)
  );
}

function unwrapModelContentEnvelope<TResult>(
  output: TResult | ModelContentEnvelope<TResult>,
): {
  result: TResult;
  modelContent?: readonly ToolModelContentPart[];
} {
  if (isModelContentEnvelope(output)) {
    return {
      result: output.value,
      modelContent: output.__aui_modelContent,
    };
  }
  return { result: output };
}

function toAISDKContent(parts: readonly ToolModelContentPart[]) {
  return {
    type: "content" as const,
    value: parts.map((part) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      const isImage = part.mediaType.startsWith("image/");
      return isImage
        ? {
            type: "image-data" as const,
            data: part.data,
            mediaType: part.mediaType,
          }
        : {
            type: "file-data" as const,
            data: part.data,
            mediaType: part.mediaType,
            ...(part.filename !== undefined && { filename: part.filename }),
          };
    }),
  };
}

function toAISDKDefaultOutput(output: unknown) {
  return typeof output === "string"
    ? { type: "text" as const, value: output }
    : { type: "json" as const, value: (output ?? null) as unknown };
}

export const defaultToModelOutput = ({ output }: { output: unknown }) => {
  const { result, modelContent } = unwrapModelContentEnvelope(output);
  if (modelContent !== undefined) {
    return toAISDKContent(modelContent);
  }
  return toAISDKDefaultOutput(result);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validateFrontendTool(
  name: string,
  tool: unknown,
): asserts tool is ToolJSONSchema {
  if (!isPlainObject(tool)) {
    throw new Error(
      `frontendTools() expected tool "${name}" to be an object with a JSON Schema parameters object.`,
    );
  }

  if (!isPlainObject(tool.parameters)) {
    throw new Error(
      `frontendTools() expected tool "${name}" to include a JSON Schema parameters object.`,
    );
  }

  if (tool.description !== undefined && typeof tool.description !== "string") {
    throw new Error(
      `frontendTools() expected tool "${name}" description to be a string.`,
    );
  }

  if (
    tool.providerOptions !== undefined &&
    !isPlainObject(tool.providerOptions)
  ) {
    throw new Error(
      `frontendTools() expected tool "${name}" providerOptions to be an object.`,
    );
  }
}

function validateFrontendTools(tools: unknown): asserts tools is FrontendTools {
  if (!isPlainObject(tools)) {
    throw new Error(
      "frontendTools() expected tools to be an object keyed by tool name.",
    );
  }

  for (const [name, tool] of Object.entries(tools)) {
    validateFrontendTool(name, tool);
  }
}

export const frontendTools = (tools: FrontendTools): ToolSet => {
  validateFrontendTools(tools);

  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description !== undefined && {
          description: tool.description,
        }),
        inputSchema: jsonSchema(tool.parameters),
        toModelOutput: defaultToModelOutput,
        ...(tool.providerOptions && { providerOptions: tool.providerOptions }),
      },
    ]),
  ) as ToolSet;
};
