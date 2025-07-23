# Orchestrator Embedding Endpoint

## Usage

- **Route:** `POST /api/orchestrator/embed`
- **Body:** `{ text: string, model?: string }`
- **Response:** `{ embedding: number[] }`

## Example

```
curl -X POST http://localhost:5000/api/orchestrator/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}'
```

## Edge Cases

- Empty or missing `text` returns 400 error.
- Service errors return 500 with details.

## Integration

- Used by `embeddingService.ts` for all semantic embedding requests.
- Forwards to the correct model/server via orchestrator logic.

## Testing

- Unit tests should cover valid, empty, and error cases.
- See `embeddingService.test.ts` for service-level tests.

## Architecture

- Follows Clean Architecture: API → Application → Infrastructure.
- No direct calls to embedding models; all requests routed through orchestrator.

## Updates

- July 22, 2025: Endpoint created for centralized embedding routing.
