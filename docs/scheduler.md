# Scheduler internals

> How a state change becomes a DOM update. Internal documentation; none of this is public API.

Rendering is synchronous: one render pass renders every component that needs it, commits the DOM and runs effects, without yielding to the browser in between.

## Pieces

| File                     | Role                                                                            |
| :----------------------- | :------------------------------------------------------------------------------ |
| `scheduler/Scheduler.ts` | One per root. Queues work, runs the render pass, blocks during controlled input |
| `scheduler/SyncWork.ts`  | The four queues of a pass and the code that drains each one                     |
| `scheduler/FiberWork.ts` | A set of fibers bucketed by tree depth, so parents are handled before children  |

## Phases

A pass drains four queues in order:

1. **render** — run each scheduled component, parents before children, reconcile its output and record DOM work as `UIAction`s on the fiber. No DOM is touched. A render can only schedule deeper fibers — a state setter throws during `RENDER`, and a context change only reaches consumers below the provider — so everything scheduled mid-render is picked up later in the same loop, and the queue can be cleared once the loop ends.
2. **prepare commit** (`prepareCommitWork`, run at the start of `commit()`) — each queued fiber's `prepareChunk()` folds newly mounted subtrees into its staging `DocumentFragment`, so a whole new subtree is inserted with one DOM operation.
3. **commit** — apply the recorded `UIAction`s (insert, move, remove, text, props) and promote `pendingSlot` to `slot`.
4. **postCommit** — run effects, or unmount hook cleanups for fibers that disappeared.

## Run loop

`scheduleRender` adds the fiber to the render queue and, unless a pass is already running or the scheduler is blocked, queues `#run` as a microtask. Several updates in one tick therefore share one pass.

`#run` handles any leftover post-commit work, then loops while the render queue is non-empty: it increments `renderIteration`, renders, commits and runs post-commit. Effects that set state therefore get their pass within the same run. `#stage` (`IDLE`, `RENDER`, `COMMIT`, `POST_COMMIT`) keeps work scheduled during a pass from starting a nested one, and a state setter called during `RENDER` throws.

## Controlled inputs

`Root` listens on its container:

- `beforeinput` (capture phase) blocks the scheduler until the matching `input` has been handled.
- `input` (bubble phase, so after the element's own handler has read the new value) puts the element — for radios, the whole group — back to the value last rendered, then unblocks. If the handler changed state, the next commit writes the new value.

The "last rendered" values live in a `WeakMap` filled at mount and on every `value`/`checked` patch.
