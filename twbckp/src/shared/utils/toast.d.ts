/**
 * Toast notification utility
 * Simple API for showing toast messages throughout the extension
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}
interface ToastInstance {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
}
declare class ToastManager {
    private toasts;
    private listeners;
    show(options: ToastOptions): string;
    success(message: string, duration?: number): string;
    error(message: string, duration?: number): string;
    warning(message: string, duration?: number): string;
    info(message: string, duration?: number): string;
    remove(id: string): void;
    subscribe(callback: (toasts: ToastInstance[]) => void): () => void;
    private notifyListeners;
}
export declare const toast: ToastManager;
export type { ToastInstance };
//# sourceMappingURL=toast.d.ts.map