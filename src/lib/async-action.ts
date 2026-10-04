import { toast } from "sonner";

type ErrorHandler = (error: unknown) => void;

function reportAsyncError(error: unknown): void {
  console.error("Unexpected action failure:", error);
  toast.error("The action failed. Please try again.");
}

/** Observe background work that can reject; action-specific errors stay local. */
export function runAsyncAction(
  action: Promise<unknown>,
  onError: ErrorHandler = reportAsyncError,
): void {
  void action.catch(onError);
}

/** Adapt async actions to React's void-returning event handler contract. */
export function withAsyncHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<unknown>,
  onError: ErrorHandler = reportAsyncError,
): (...args: Args) => void {
  return (...args) => {
    try {
      runAsyncAction(handler(...args), onError);
    } catch (error) {
      onError(error);
    }
  };
}
