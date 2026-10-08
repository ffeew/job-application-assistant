import { toast } from "sonner";

type ErrorHandler = (error: unknown) => void;

function reportAsyncError(error: unknown): void {
  console.error("Unexpected action failure:", error);
  toast.error("The action failed. Please try again.");
}

/** Background failures need an observer even when no caller awaits them. */
export function runAsyncAction(
  action: Promise<unknown>,
  onError: ErrorHandler = reportAsyncError,
): void {
  void action.catch(onError);
}

/** React does not observe rejected event-handler promises. */
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
