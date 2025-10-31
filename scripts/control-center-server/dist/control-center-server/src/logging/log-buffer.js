export class LogBuffer {
    capacity;
    entries = [];
    constructor(capacity = 200) {
        this.capacity = capacity;
    }
    push(entry) {
        this.entries.push(entry);
        if (this.entries.length > this.capacity) {
            this.entries.shift();
        }
    }
    list() {
        return [...this.entries];
    }
}
//# sourceMappingURL=log-buffer.js.map