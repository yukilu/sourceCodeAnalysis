class Observable {
    constructor(fn) {
        this.main = fn;
    }

    subscribe(observer, error, complete) {
        const isSubject = observer.isSubject;
        if (typeof observer === 'function' && !isSubject)
            observer = { next: observer, error, complete };

        const subscription = {};
        subscription.unsubscribe = this.main(observer);

        return subscription;
    }

    multicast(subject) {
        return new Multicasted(this, subject);
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
            return input.subscribe({  // 直接return subscription也行，但是代码会显得难以理解
                next(v) {
                    if (filterFn(v))
                        observer.next(v);
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
        node['on' + type] = function (ev) {
            observer.next(ev);
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

const Rx = { Subject, BehaviorSubject, ReplaySubject, Observable };