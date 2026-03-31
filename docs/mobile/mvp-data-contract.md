# Mobile MVP Data Contract

This document maps the read-only mobile MVP screens to backend data contracts.

## Screen to Endpoint Mapping

- `Login`: `POST /api/mobile/v1/auth/login`
- `Refresh Token`: `POST /api/mobile/v1/auth/refresh`
- `Session bootstrap`: `GET /api/mobile/v1/auth/me`
- `Dashboard overview`: `GET /api/mobile/v1/dashboard/overview`
- `Positions`: `GET /api/mobile/v1/dashboard/positions`
- `Performance`: `GET /api/mobile/v1/dashboard/performance`
- `Market snapshot`: `GET /api/mobile/v1/market/live`
- `Engine status`: `GET /api/mobile/v1/engine/status`

All endpoints except login require `Authorization: Bearer <accessToken>`.

## Response Envelope

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid token"
  }
}
```

## Auth Header

- Mobile clients must send `Authorization: Bearer <accessToken>` for all endpoints except `POST /api/mobile/v1/auth/login` and `POST /api/mobile/v1/auth/refresh`.
- On `401`, clients should attempt token refresh (using `refreshToken`) and retry the original request once.

## Dashboard Overview Contract

```json
{
  "ok": true,
  "data": {
    "user": { "id": "u1", "name": "Trader", "email": "x@y.com", "role": "user" },
    "stats": {
      "activeBots": 1,
      "totalBots": 2,
      "activeTrades": 3,
      "totalTrades": 48,
      "totalPnl": 125.2
    },
    "wallet": {
      "binance": null,
      "coindcx": null
    },
    "updatedAt": "2026-03-20T00:00:00.000Z"
  }
}
```

## Positions Contract

```json
{
  "ok": true,
  "data": {
    "positions": [
      {
        "id": "t1",
        "symbol": "BTCUSDT",
        "side": "long",
        "status": "active",
        "entryPrice": 82000,
        "currentPrice": 82500,
        "stopLoss": 78000,
        "takeProfit": 86000,
        "pnl": 10.4,
        "openedAt": "2026-03-20T00:00:00.000Z"
      }
    ]
  }
}
```

## Performance Contract

```json
{
  "ok": true,
  "data": {
    "summary": {
      "allTimePnl": 532.9,
      "allTimeTrades": 128,
      "allTimeRoi": 12.5
    }
  }
}
```
