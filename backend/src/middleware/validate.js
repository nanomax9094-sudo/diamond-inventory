/**
 * Validation middleware factory. Runs a Zod schema against req.body, replaces
 * it with the parsed/sanitized data, and returns a 400 with field-level errors
 * on failure: { message, errors: { field: 'message' } }.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] || '_';
        if (!errors[key]) errors[key] = issue.message;
      }
      return res
        .status(400)
        .json({ message: 'Validation failed. Please check the highlighted fields.', errors });
    }
    req.body = result.data;
    next();
  };
}
