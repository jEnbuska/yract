# Scheduler internals

> How a state change becomes a DOM update. Internal documentation; none of this is public API.

## Pieces

| File                                  | Role                                                                       |
| :------------------------------------ | :------------------------------------------------------------------------- |
| `scheduler/Scheduler.ts`              | One per root. Owns both lifecycle groups and the run loop                  |
| `scheduler/SyncLifecycleGroup.ts`     | Urgent work: rendered and committed in one synchronous pass                |
| `scheduler/DeferredLifecycleGroup.ts` | Work under `useDefer`: rendered in time slices, committed when caught up   |
| `scheduler/SyncFiberGroup.ts`         | Fibers bucketed by tree depth, so parents render before children           |
| `scheduler/DeferredFiberGroup.ts`     | The same, with a direction so deferred work can pop parent- or child-first |
| `scheduler/RenderClock.ts`            | 20 ms work budget; yields to the browser through a `MessageChannel`        |

A fiber goes to the deferred group when `fiber.isDeferred()` is true, i.e. it sits under a mounted `Defer`.

## Phases

Each group moves fibers through four queues:

1. **render** — run the component, reconcile its output, and record DOM work as `UIAction`s on the fiber. No DOM is touched.
2. **prepareChunk** — newly mounted subtrees are folded into their parent's staging `DocumentFragment`, so a whole new subtree is inserted with one DOM operation.
3. **commit** — apply the recorded `UIAction`s (insert, move, remove, text, props) and promote `pendingSlot` to `slot`.
4. **postCommit** — run effects, or unmount hook cleanups for fibers that disappeared.

## Run loop

`Scheduler.run` wakes whenever something is scheduled:

1. While there is sync work: render → commit → postCommit, all synchronously. The user never sees a half-applied sync update.
2. If only deferred work is left, render it in slices. After each fiber the clock checks its budget; when spent it yields to the browser, and the loop drops back to step 1 if sync work arrived meanwhile.
3. When the deferred queue is empty, commit it in one go, run its effects, then resolve the promises returned by `useState` setters.

## Controlled inputs

`Root` listens on its container:

- `beforeinput` (capture phase) blocks the scheduler until the matching `input` has been handled.
- `input` (bubble phase, so after the element's own handler has read the new value) puts the element — for radios, the whole group — back to the value last rendered, then unblocks. If the handler changed state, the next commit writes the new value.

The "last rendered" values live in a `WeakMap` filled at mount and on every `value`/`checked` patch.
