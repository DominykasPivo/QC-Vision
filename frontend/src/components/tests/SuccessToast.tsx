interface SuccessToastProps {
  show: boolean;
  message: string;
}

export function SuccessToast({ show, message }: SuccessToastProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(var(--nav-height)+1rem)] left-4 right-4 z-[210] rounded-xl border border-green-300 bg-green-100 px-6 py-3 text-center text-sm font-medium text-green-700 shadow-lg sm:left-auto sm:right-6 sm:max-w-sm">
      ✓ {message}
    </div>
  );
}
