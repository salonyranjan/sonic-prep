import Vapi from "@vapi-ai/web";

let client: Vapi | undefined;

export function getVapi() {
  const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
  if (!token) return null;
  client ??= new Vapi(token);
  return client;
}
