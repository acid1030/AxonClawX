# AxonClawX Resource Library API

Lightweight Node.js service for AxonClawX creative resources.

## Endpoints

- `GET /api/health`
- `GET /api/resource-library/latest`
- `POST /api/resource-library/items`
- `POST /api/resource-library/import`

Write endpoints require:

```http
X-Admin-Token: <ADMIN_TOKEN>
Content-Type: application/json
```

## Single Item Write

```json
{
  "category": "imagePrompts",
  "id": "image-product-hero-v2",
  "title": "产品主视觉",
  "description": "文字说明",
  "prompt": "premium product photography...",
  "imageUrl": "https://example.com/image.png",
  "imageAlt": "图片说明",
  "tags": ["产品图", "电商"],
  "level": "basic"
}
```

`imageBase64` also accepts a data URL such as `data:image/png;base64,...`.

## Bulk Import

```json
{
  "categories": [
    {
      "id": "cameraPrompts",
      "title": "运镜提示词",
      "description": "视频运镜资源",
      "items": [
        {
          "id": "camera-slow-push-in",
          "title": "慢速推进",
          "description": "从环境推进到主体",
          "prompt": "slow cinematic push-in...",
          "tags": ["推进", "氛围"],
          "level": "basic"
        }
      ]
    }
  ]
}
```
