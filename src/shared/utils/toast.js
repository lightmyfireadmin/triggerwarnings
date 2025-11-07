/**
 * Toast notification utility
 * Simple API for showing toast messages throughout the extension
 */
class ToastManager {
    toasts = [];
    listeners = [];
    show(options) {
        const toast = {
            id: Math.random().toString(36).substr(2, 9),
            message: options.message,
            type: options.type || 'info',
            duration: options.duration || 3000,
        };
        this.toasts.push(toast);
        this.notifyListeners();
        return toast.id;
    }
    success(message, duration) {
        return this.show({ message, type: 'success', duration });
    }
    error(message, duration) {
        return this.show({ message, type: 'error', duration });
    }
    warning(message, duration) {
        return this.show({ message, type: 'warning', duration });
    }
    info(message, duration) {
        return this.show({ message, type: 'info', duration });
    }
    remove(id) {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.notifyListeners();
    }
    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.toasts); // Immediately call with current toasts
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
        };
    }
    notifyListeners() {
        this.listeners.forEach((listener) => listener([...this.toasts]));
    }
}
// Export singleton instance
export const toast = new ToastManager();
//# sourceMappingURL=toast.js.map