export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ToolResponse {
  status: "SUCCESS" | "FAILED";
  data: Record<string, any>;
}

// Tool stubs - mock implementations
export const toolStubs = {
  tool_read_file: (args: Record<string, any>): ToolResponse => {
    const path = args.path || "unknown";
    return {
      status: "SUCCESS",
      data: {
        file_contents: `Mock file contents for ${path}\n\nThis is a placeholder response from the stubbed tool.\nIn a real implementation, this would read the actual file.`,
      },
    };
  },

  tool_search_files: (args: Record<string, any>): ToolResponse => {
    const path = args.path || ".";
    const filter = args.filter || "*";
    return {
      status: "SUCCESS",
      data: {
        files: [
          `${path}/src/main.tsx`,
          `${path}/src/App.tsx`,
          `${path}/src/components/Example.tsx`,
          `${path}/package.json`,
        ],
      },
    };
  },

  tool_create_file: (args: Record<string, any>): ToolResponse => {
    const path = args.path || "unknown";
    return {
      status: "SUCCESS",
      data: {
        status: "SUCCESS",
        message: `Mock: Created file at ${path}`,
      },
    };
  },

  tool_go_code_editor: (args: Record<string, any>): ToolResponse => {
    const path = args.path || "unknown";
    const lineNumber = args.line_number || 1;
    const typeChange = args.type_change || "add";
    const lineChange = args.line_change || "";
    
    let action = "";
    switch (typeChange) {
      case "add":
        action = `Added line at position ${lineNumber}`;
        break;
      case "replace":
        action = `Replaced line ${lineNumber}`;
        break;
      case "delete":
        action = `Deleted line ${lineNumber}`;
        break;
      default:
        action = `Unknown action: ${typeChange}`;
    }

    return {
      status: "SUCCESS",
      data: {
        message: `Mock: ${action} in ${path}`,
        change: lineChange,
      },
    };
  },
};

// Tool definitions for Ollama API
export const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "tool_read_file",
      description:
        "Read the contents of a given file path or search for files containing a pattern. When searching file contents, returns line numbers where the pattern is found.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "The relative path of a file in the working directory. If pattern is provided, this can be a directory path to search in.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tool_search_files",
      description:
        "Search a directory at a given path for files that match a given file name or contain a given string. If no path is provided, search files will look in the current directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Relative path to search files from. Defaults to current directory if not provided.",
          },
          filter: {
            type: "string",
            description:
              "The filter to apply to the file names. It supports regex syntax. If not provided, no filtering will take place. If provided, only return files that match the filter.",
          },
          contains: {
            type: "string",
            description:
              "A string to search for inside files. It supports regex syntax. If not provided, no search will be performed. If provided, only return files that contain the string.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tool_create_file",
      description: "Creates a new file",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path and name of the file to create.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tool_go_code_editor",
      description: "Edit Golang source code files including adding, replacing, and deleting lines.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path and name of the Golang file",
          },
          line_number: {
            type: "integer",
            description: "The line number for the code change",
          },
          type_change: {
            type: "string",
            description: "The type of change to make: add, replace, delete",
          },
          line_change: {
            type: "string",
            description: "The text to add, replace, delete",
          },
        },
        required: ["path", "line_number", "type_change", "line_change"],
      },
    },
  },
];

export function executeToolCall(toolName: string, args: Record<string, any>): ToolResponse {
  const toolFn = toolStubs[toolName as keyof typeof toolStubs];
  if (!toolFn) {
    return {
      status: "FAILED",
      data: { error: `Tool ${toolName} not found` },
    };
  }
  return toolFn(args);
}
