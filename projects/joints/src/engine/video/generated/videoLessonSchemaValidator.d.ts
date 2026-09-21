export interface SchemaError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
}
export interface GeneratedValidator {
  (data: unknown): boolean;
  errors?: SchemaError[] | null;
}
export declare const schemaSha256: string;
export declare const validate: GeneratedValidator;
export default validate;
