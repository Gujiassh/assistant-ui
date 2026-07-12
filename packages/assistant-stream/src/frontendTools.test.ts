import { describe, expect, it } from "vitest";

import { frontendTools } from "./frontendTools";

describe("assistant-stream frontendTools export", () => {
  it("forwards description and inputSchema for each tool", () => {
    const tools = frontendTools({
      getWeather: {
        description: "Get the weather",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
        },
      },
    });

    expect(tools.getWeather?.description).toBe("Get the weather");
    expect(tools.getWeather?.inputSchema).toBeDefined();
  });

  it("keeps transformed model content envelopes working", async () => {
    const tools = frontendTools({
      readPdf: {
        parameters: { type: "object" },
      },
    });

    const output = await tools.readPdf!.toModelOutput!({
      toolCallId: "tc-1",
      input: {},
      output: {
        __aui_modelContent: [
          { type: "text", text: "PDF contents:" },
          {
            type: "file",
            data: "JVBERi0xLjQK",
            mediaType: "application/pdf",
            filename: "doc.pdf",
          },
        ],
        value: { mediaType: "application/pdf", base64: "JVBERi0xLjQK" },
      },
    });

    expect(output).toEqual({
      type: "content",
      value: [
        { type: "text", text: "PDF contents:" },
        {
          type: "file-data",
          mediaType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "doc.pdf",
        },
      ],
    });
  });
});
