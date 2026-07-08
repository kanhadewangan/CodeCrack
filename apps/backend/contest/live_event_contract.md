# Contest Live Event Contract

## Socket Endpoint

- URL: `http://localhost:3001/contests`
- Room: `contest:<contestId>`
- Auth: pass the same JWT used for REST APIs.

```ts
const socket = io("http://localhost:3001/contests", {
  auth: { token: localStorage.getItem("oj_token") },
});
```

## Client Events

### `join_contest`

Payload:

```ts
{ contestId: string }
```

The server verifies the authenticated user is registered for the contest before joining `contest:<contestId>`.

Ack or emitted response:

```ts
{ contestId: string; room: string }
```

### `leave_contest`

Payload:

```ts
{ contestId: string }
```

### `leaderboard:sync`

Payload:

```ts
{ contestId: string; topN?: number }
```

Response event or ack payload:

```ts
{
  contestId: string;
  updatedAt: string;
  rankings: Array<{
    rank: number;
    userId: string;
    username: string;
    score: number;
    penalty: number;
  }>;
}
```

## Server Events

### `contest:started`

```ts
{
  contestId: string;
  actualStartTime: string;
  actualEndTime: string;
}
```

### `leaderboard:update`

Broadcast at most once per second per contest after scoring changes.

```ts
{
  contestId: string;
  updatedAt: string;
  rankings: Array<{
    rank: number;
    userId: string;
    username: string;
    score: number;
    penalty: number;
  }>;
}
```

### `contest:ended`

```ts
{
  contestId: string;
  endedAt: string;
  finalRankings: Array<{
    rank: number;
    userId: string;
    username: string;
    score: number;
    penalty: number;
  }>;
}
```

### `contest:error`

```ts
{
  code: "AUTHENTICATION_REQUIRED" | "INVALID_PAYLOAD" | "NOT_REGISTERED";
  message: string;
}
```

## REST Endpoints Added

- `POST /contest/start-contest/:contestId`
- `GET /contest/get-contest-leaderboard/:contestId?topN=50`
- `GET /contest/get-contest-submissions/:contestId`
- `POST /contest/submit-contest-problem`

`startContest` error codes:

- `404 CONTEST_NOT_FOUND`
- `403 NOT_AUTHORIZED`
- `409 INVALID_CONTEST_STATE`
- `400 INVALID_START_TIME`
- `400 NO_PROBLEMS_ADDED`
- `400 INSUFFICIENT_PARTICIPANTS`
