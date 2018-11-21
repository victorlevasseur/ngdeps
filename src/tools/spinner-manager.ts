const ora = require('ora');

export class SpinnerManager {
    private pendingItems: string[] = [];

    private finishedItems: string[] = [];

    private pendingSpinner: any;

    constructor(private items: string[], initialSpinnerText: string) {
        this.pendingSpinner = ora(initialSpinnerText).stop();
    }

    /**
     * Declare an item pending. If it's already pending, the function does nothing.
     * @param item the item to be marked pending.
     */
    declareItemPending(item: string): void {
        if (this.pendingItems.find((i) => i === item)) {
            return;
        }

        this.finishedItems = this.finishedItems.filter((i) => i !== item);
        this.pendingItems.push(item);

        this.updatePendingSpinner();
    }

    /**
     * Declare an item finished. If it's already finished, the function does nothing.
     * @param item the item
     * @param success whether the item was successful or not.
     */
    declareItemFinished(item: string, success: boolean): void {
        if (this.finishedItems.find((i) => i === item)) {
            return;
        }

        this.pendingItems = this.pendingItems.filter((i) => i !== item);
        this.finishedItems.push(item);

        const finishedSpinner = ora(item).start()
        if (success) {
            finishedSpinner.succeed();
        } else {
            finishedSpinner.fail();
        }
        this.updatePendingSpinner();
    }

    private updatePendingSpinner(): void {
        this.pendingSpinner.text = this.pendingItems.reduce((str, item) => {
            if (str === '') {
                return item;
            } else {
                return str + ', ' + item;
            }
        }, '') + ` [${this.finishedItems.length + this.pendingItems.length}/${this.items.length}]`;
        if (!this.pendingSpinner.isSpinning) {
            this.pendingSpinner.start();
        }
    }
}