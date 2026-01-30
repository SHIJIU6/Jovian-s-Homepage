/**
 * 图片获取 API
 * GET /api/images/[filename] - 从 R2 获取图片
 * 
 * @requires IMAGES - R2 bucket
 */

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const filename = url.pathname.replace('/api/images/', '');

    if (!filename) {
      return new Response('Not Found', { status: 404 });
    }

    // 从 R2 获取图片
    const object = await context.env.IMAGES.get(filename);

    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    // 返回图片
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000'); // 缓存 1 年
    headers.set('ETag', object.etag);

    return new Response(object.body, { headers });

  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
}
