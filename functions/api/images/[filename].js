/**
 * Image fetch API.
 * Reference: Cloudflare R2 object response metadata handling (compatible with current `wrangler` 3.114.17 runtime).
 */

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const filename = url.pathname.replace("/api/images/", "").trim();

    if (!filename) {
      return new Response("Not Found", { status: 404 });
    }

    const object = await context.env.IMAGES.get(filename);
    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");

    if (object.etag) {
      headers.set("ETag", object.etag);
    }

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
