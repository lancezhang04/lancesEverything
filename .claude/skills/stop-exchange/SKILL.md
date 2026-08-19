---
name: stop-exchange
description: Tear down the local test servers started by test-exchange — the uvicorn backend on port 8000 and the Vite frontend on port 5173 — and confirm both ports are free. Use when finished testing, debugging, or demoing the exchange feature.
---

# Stop the local test servers

Shuts down the backend and frontend started by [test-exchange](../test-exchange/SKILL.md)
and verifies nothing is left listening.

## 1. Stop the background tasks

If the servers were started in this session, stop them by task ID with `TaskStop` —
that is cleaner than killing by port, because it also reaps the `--reload` reloader
and the `npm run dev` shell that wraps Vite.

The backend task is the one running `uvicorn app.main:app`; the frontend task is the
one running `npm run dev`. If the task IDs have scrolled out of view, list the
running background tasks rather than guessing.

## 2. Confirm both ports are free

```bash
curl -s -m 2 -o /dev/null -w "backend :8000 -> %{http_code}\n" http://localhost:8000/health || echo "backend :8000 -> down"
curl -s -m 2 -o /dev/null -w "frontend :5173 -> %{http_code}\n" http://localhost:5173/ || echo "frontend :5173 -> down"
lsof -nP -iTCP:8000 -iTCP:5173 -sTCP:LISTEN || echo "no listeners"
```

A `%{http_code}` of `000` means the connection was refused — that is the wanted
result here, not an error.

## 3. Clean up strays if anything survived

Only needed when a server was started outside this session, or a task ID is gone.
Check what the PIDs actually are before killing, so a real dev server or an
unrelated process on the same port is not taken down by accident:

```bash
lsof -nP -iTCP:8000 -iTCP:5173 -sTCP:LISTEN
kill <pid>          # SIGTERM first; uvicorn and Vite both exit cleanly on it
kill -9 <pid>       # only if a PID is still listening after SIGTERM
```

Re-run the checks in step 2 afterwards.

## Notes

- All exchange state is in memory in `backend/app/services/exchange_service.py`, so
  stopping the backend discards every account, product and trade. There is nothing
  to clean up on disk and no database to reset — starting over means re-running
  `test-exchange`, which re-seeds from scratch.
- Session archives already copied into `frontend/src/data/sessions/` are real files
  and survive teardown. Leave them alone unless the user asks; the Past sessions tab
  reads them.
- Do not delete `backend/venv` or `frontend/node_modules` as part of a teardown.
  Rebuilding them costs minutes on the next run, and neither holds test state.
