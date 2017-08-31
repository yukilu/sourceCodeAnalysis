class Observer {
    constructor(nextOrObserver, error, complete) {
        if (typeof nextOrObserver === 'object') {
            this._next = nextOrObserver.next;
            this._error = nextOrObserver.error;
            this._complete = nextOrObserver.complete;
        } else {
            this._next = nextOrObserver;
            this._error = error;
            this._complete = complete;
        }

        this.completed = false;
        this.next = this.next.bind(this);
        this.error = this.error.bind(this);
        this.complete = this.complete.bind(this);
    }

    next(v) {
        if (!this.completed)
            this._next && this._next(v);
    }

    error(err) {
        if (!this.completed)
            this._error && this._error(err);
    }

    complete(arg) {
        if (!this.completed) {
            this._complete && this._complete(arg);
            this.completed = true;
        }
    }
}

class Observable {
    constructor(fn) {
        this.main = fn;
    }

    subscribe(nextOrObserver, error, complete) {
        let observer = null;
        if (typeof observerOrNext === 'function')
            observer = new Observer(nextOrObserver, error, complete);
        else if (!nextOrObserver.isSubject)
            observer = new Observer(nextOrObserver);

        let subscription = null;
        let isCleared = false;
        const unsubscribeFn = this.main(observer);
        if (typeof unsubscribeFn === 'object')  // create中传入的fn返回值为subscription时
            subscription = unsubscribeFn;
        else  // typeof unsubscribeFn === 'function'
            subscription = {
                unsubscribe() {
                    if (isCleared)
                        return;

                    isCleared = true;
                    unsubscribeFn && unsubscribeFn();
                }
            };

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
                    },
                    complete: observer.complete
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
        });
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
            const subscription = input.subscribe({ next: v => observer.next(mapFn(v)), complete: observer.complete });
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
                },
                complete: observer.complete
            });
        });
    }

    merge(...observables) {
        return Observable.merge(this, ...observables);
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

    /* a值发出time时间段内无值发出，则time时间段后发出当前值，若a值发出time时间段内发出b值，则抛弃a值，看b值发出time时间段内是否
     * 有值发出，无值则发出b值，若有c值发出，抛弃b值，判断c值发出time时间段内是否有值发出，无则发出c值，有则抛弃c值，继续判断后续值
     * 即a值发出time时间段内判断是否有b值发出，无则发出a值，有就继续判断后续值...，直到出现某值x在time时间段内无值发出，发出值x */
    debounceTime(time) {  // debounce 去抖动，即用新值刷新旧值
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
                },
                complete: observer.complete
            });
        });
    }
    /* debounceTime和throttleTime的区别
     * debounceTime是前值发出后time时间段内没有后值发出就发出该值，若有，则抛弃前值，继续判断新值...
     * throttleTime是前值发出后time时间段内的后值全部忽略，超过time时间段后的第一个值再发出，其后time时间段的值忽略... */

    // a值发出后time时间段内的值都省略，超过这段时间后再发出第二个值b，b值发出后time时间段内的值省略，超过这个时间段发出第三个值c...
    throttleTime(time) {  // 节流 即一段时间内只发出第一个值
        const input = this;
        return Observable.create(function (observer) {
            let lastTime = 0;
            let currentTime = 0;

            return input.subscribe({
                next(v) {
                    currentTime = Date.now();
                    if (!lastTime) {
                        observer.next(v);
                        lastTime = currentTime;
                        return;
                    }

                    if (currentTime - lastTime > time) {
                        observer.next(v);
                        lastTime = currentTime;
                    }
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    zip(project, ...observables) {
        return Observable.zip(project, this, ...observables);
    }

    combineLatest(observable, project) {
        const input = this;
        return Observable.create(function (observer) {
            let inputLatest, obLatest;
            let inputComplete = false;
            let obComplete = false;
            const subscriptionInput = input.subscribe({
                next(v) {
                    inputLatest = v;
                    if (typeof obLatest !== 'undefined')
                        observer.next(project(inputLatest, obLatest));       
                },
                complete() {
                    inputComplete = true;
                    if (obComplete)
                        observer.complete();
                }
            });

            const subscription = observable.subscribe({
                next(v) {
                    obLatest = v;
                    if (typeof inputLatest !== 'undefined')
                        observer.next(project(inputLatest, obLatest));
                },
                complete() {
                    obComplete = true;
                    if (inputComplete)
                        observer.complete();
                }
            });

            return function () {
                subscriptionInput.unsubscribe && subscriptionInput.unsubscribe();
                subscription.unsubscribe && subscription.unsubscribe();
            };
        });
    }

    take(num) {
        const input = this;
        return Observable.create(function (observer) {
            let count = 0;
            const subscription = input.subscribe({
                next(v) {
                    count++;
                    observer.next(v);
                    if (count === num) {
                        observer.complete();
                        subscription.unsubscribe && subscription.unsubscribe();
                    }
                }
            });

            return subscription;
        });
    }

    concat(...observables) {
        return Observable.concat(this, ...observables);
    }
}

Observable.create = function (fn) {
    return new Observable(fn);
};

Observable.from = function (array) {
    return Observable.create(observer => {
        array.forEach(item => observer.next(item));
        observer.complete();
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

Observable.merge = function (...observables) {
    return Observable.create(function (observer) {
        const completes = new Array(observables.length);
        const subscriptions = [];
        completes.fill(false);
        observables.forEach((observable, index) => {
            subscriptions[index] = observable.subscribe({
                next: observer.next,
                error: observer.error,
                complete() {
                    completes[index] = true;
                    if (completes.every(completed => completed))
                        observer.complete();
                }
            });
        });

        return function () {
            subscriptions.forEach(subscription => subscription.unsubscribe && subscription.unsubscribe());
        };
    });
};

Observable.concat = function (...observables) {
    return Observable.create(function (observer) {
        let subscriptions = [];
        let length = observables.length;
        let observers = [];
        // 因complete是个函数，其中的代码只会在调用时执行，其中的变量也只会在调用时查看当时对应的值，类似于异步，用了let，所以不需要用自执行函数
        for (let i = 0; i < length - 1; i++)
            observers[i] = {
                next: observer.next,
                error: observer.error,
                complete() {
                    subscriptions[i + 1] = observables[i + 1].subscribe(observers[i + 1]);
                }
            };

        // 最后一个observer不同，complete指向observer.complete
        observers.push({
            next: observer.next,
            error: observer.error,
            complete: observer.complete
        });

        subscriptions[0] = observables[0].subscribe(observers[0]);  // 从0开始启动

        return function () {
            subscriptions.forEach(subscription => subscription.unsubscribe());
        };
    });
};

Observable.zip = function (project, ...observables) {
    return Observable.create(function (observer) {
        const length = observables.length;
        const indexs = new Array(length);
        const arrays = [];
        const completes = new Array(length);
        const subscriptions = [];

        indexs.fill(0);
        completes.fill(false);
        for (let i = 0; i < length; i++)
            arrays[i] = [];

        for (let i = 0; i < length; i++)
            subscriptions[i] = observables[i].subscribe({
                next(v) {
                    indexs[i]++;
                    arrays[i].push(v);

                    if(indexs.every(index => index !== 0)) {
                        const vals = [];

                        for (let j = 0; j < length; j++) {
                            vals[j] = arrays[j][0];
                            arrays[j].shift();
                            indexs[j]--;
                        }
                        
                        observer.next(project(...vals));
                    }
                },
                error: observer.error,
                complete() {
                    completes[i] = true;
                    if (completes.every(completed => completed))
                        observer.complete();
                }
            });

        return function () {
            subscriptions.forEach(subscription => subscription.unsubscribe());
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

Subject.prototype.isSubject = true;

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