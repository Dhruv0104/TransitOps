function parseSort(query, allowedFields, defaultField = "createdAt") {
  const sortBy = allowedFields.includes(query.sortBy)
    ? query.sortBy
    : defaultField;
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { [sortBy]: sortOrder };
}

module.exports = { parseSort };
