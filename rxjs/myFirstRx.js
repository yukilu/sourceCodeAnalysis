class Observable {
    constructor(fn) {
        this.main = fn;
    }

    subscribe(observer, error, complete) {
        const isSubject = observer.isSubject;
        if (typeof observer === 'function' && !isSubject)
            observer = { next: observer, error, complete };

        let subscription = null;
        const unsubscribe = this.main(observer);
        if (typeof unsubscribe === 'object')  // create中传入的fn返回值为subscription时
            subscription = unsubscribe;
        else  // typeof unsubscribe === 'function'
            subscription = { unsubscribe };

        return subscription;
    }

    multicast(subject) {
        return new Multicasted(this, subject);
    }

    observeOn(scheduler) {
        const input = this;

        if (scheduler === 'async')
            return Observable.create(function (observer) {
                const subscription = input.subscribe({
                    next(v) {
                        setTimeout(() => {
                            observer.next(v);
                        }, 0);
                    }
                });

                return subscription;
            });
    }

    scan(pureFn, inital) {
        const input = this;
        let value = inital;
        return Observable.create(function (observer) {
            const subscription = input.subscribe({
                next(ev) {
                    observer.next(value);
                    value = pureFn(value);
                }
            });

            return subscription;
        })
    }

    multiplyByTen() {
        const input = this;
        return Observable.create(function (observer) {
            const subscription = input.subscribe({ next: v => observer.next(10 * v) });
            return subscription;
        });
    }

    map(mapFn) {
        const input = this;
        return Observable.create(function (observer) {
            const subscription = input.subscribe({ next: v => observer.next(mapFn(v)) });
            return subscription;
        });
    }

    filter(filterFn) {
        const input = this;
        return Observable.create(function (observer) {
            return input.subscribe({  // 直接将subscription返回，与上面不同，简洁但略难以理解
                next(v) {
                    if (filterFn(v))
                        observer.next(v);
                }
            });
        });
    }

    merge(...observables) {
        const input = this;
        return Observable.create(function (observer) {
            const subscriptionInput = input.subscribe(observer);
            const subscriptions = [];
            observables.forEach((observable, index) => {
                subscriptions[index] = observable.subscribe(observer);
            });

            return function () {
                subscriptionInput.unsubscribe && subscriptionInput.unsubscribe();
                subscriptions.forEach(subscription => subscription.unsubscribe && subscription.unsubscribe());
            };
        })
    }

    buffer(observable) {
        const input = this;
        let buffer = [];
        return Observable.create(function (observer) {
            const subscriptionInput = input.subscribe({
                next(v) {
                    buffer.push(v);
                }
            });

            const subscriptionTrigger = observable.subscribe({
                next(v) {
                    observer.next(buffer);
                    buffer = [];
                }
            });

            return function () {
                subscriptionInput.unsubscribe && subscriptionInput.unsubscribe();
                subscriptionTrigger.unsubscribe && subscriptionTrigger.unsubscribe();
            };
        });
    }

    debounceTime(time) {
        const input = this;
        return Observable.create(function (observer) {
            let lastTime = 0;
            let currentTime = 0;
            let intervalId = -1;
            return input.subscribe({
                next(v) {
                    currentTime = Date.now();

                    if (currentTime - lastTime < time)
                        clearInterval(intervalId);

                    intervalId = setTimeout(() => {
                        observer.next(v);
                    }, time);

                    lastTime = currentTime;
                }
            });
        });
    }
}

Observable.create = function (fn) {
    return new Observable(fn);
};

Observable.from = function (array) {
    return Observable.create(observer => {
        array.forEach(item => observer.next(item));
    });
};

Observable.fromEvent = function (node, type) {
    return Observable.create(observer => {
        listener = ev => { observer.next(ev); };
        node.addEventListener(type, listener, false);

        return function () {
            node.removeEventListener(type, listener);
        };
    });
};

Observable.interval = function (time) {
    return Observable.create(observer => {
        let n = 0;
        const id = setInterval(() => observer.next(n++), time);

        return function () {
            clearInterval(id);
        };
    });
};

class Subject {
    constructor() {
        this.observers = [];
    }

    subscribe(observer) {
        let isCleared = false;
        const observers = this.observers;
        const subscription = {};

        observers.push(observer);

        subscription.unsubscribe = function () {
            if (isCleared)
                return;

            isCleared = true;
            for (let i = 0; i < observers.length; i++)
                if (observers[i] === observer) {
                    observers.splice(i, 1);
                    return;
                }
        }

        return subscription;
    }

    next(v) {
        this.observers.forEach(observer => observer.next(v));
    }

    length() {
        return this.observers.length;
    }
}

Subject.isSubject = true;

class BehaviorSubject extends Subject {
    constructor(value) {
        super();
        this.lastValue = value;
    }

    subscribe(observer) {
        const subscription = super.subscribe(observer);
        observer.next(this.lastValue);
        return subscription;
    }

    next(v) {
        super.next(v);
        this.lastValue = v;
    }
}

class ReplaySubject extends Subject {
    constructor(num) {
        super();
        this.lastValues = new Array(num);
    }

    subscribe(observer) {
        const subscription = super.subscribe(observer);
        const lastValues = this.lastValues;
        for (let i = 0; i < lastValues.length; i++) {
            let lastValue = lastValues[i];
            if (lastValue)
                observer.next(lastValue);
        }
        return subscription;
    }

    next(v) {
        const lastValues = this.lastValues;
        super.next(v);
        lastValues.shift();
        lastValues.push(v);
    }
}

class Multicasted {
    constructor(observable, subject) {
        this.observable = observable;
        this.subject = subject;
    }

    subscribe(observer) {
        return this.subject.subscribe(observer);
    }

    connect() {
        return this.observable.subscribe(this.subject);
    }

    refCount() {
        return new ConnectableObservable(this);
    }
}

class ConnectableObservable {
    constructor(multicasted) {
        this.multicasted = multicasted;
        this.observable = multicasted.observable;
        this.subject = multicasted.subject;
        this.count = 0;
        this.connectSubscription = null;
    }

    subscribe(observer) {
        const that = this;
        const multicasted = this.multicasted;
        const subscription = multicasted.subscribe(observer);
        if (++this.count === 1)
            this.connectSubscription = multicasted.connect();

        return { 
            unsubscribe () {
                subscription.unsubscribe();
                if (!--that.count)
                    that.connectSubscription.unsubscribe();
            }
        };
    }
}

const Scheduler = { async: 'async' };

const Rx = { Subject, BehaviorSubject, ReplaySubject, Observable, Scheduler };

window.Rx = Rx;