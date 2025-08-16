import Ajv from "ajv";
import path from "path";
export interface Tool<TParams, TResult extends ToolResult = ToolResult> {
  name: string;
  description: string;
  schema: any;
  validateToolParams: (params: TParams) => string | null;
  execute: (params: TParams) => Promise<TResult>;
}

export interface ToolResult {
  llmContent: string;
}

export function validateSchema(schema: any, parameters: any): string | null {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(parameters);
  if (!valid) {
    return (
      validate.errors
        ?.map((error) => {
          return `${error.keyword}: ${error.message}`;
        })
        .join(", ") || "Validation failed"
    );
  }
  return null;
}

export function isWithinRoot(dirpath: string, rootDirectory: string): boolean {
  const normalizedPath = path.normalize(path.resolve(dirpath));
  const normalizedRoot = path.normalize(rootDirectory);
  // Ensure the normalizedRoot ends with a path separator for proper path comparison
  const rootWithSep = normalizedRoot.endsWith(path.sep)
    ? normalizedRoot
    : normalizedRoot + path.sep;
  return (
    normalizedPath === normalizedRoot || normalizedPath.startsWith(rootWithSep)
  );
}
