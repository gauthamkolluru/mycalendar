import { getStore } from "@netlify/blobs";
import { handleRequest } from "../../lib/api.js";

export default async (request) => {
  const store = getStore({ name: "calendar-tasks", consistency: "strong" });
  return handleRequest(request, process.env, store);
};

export const config = {
  path: "/api/*",
};
