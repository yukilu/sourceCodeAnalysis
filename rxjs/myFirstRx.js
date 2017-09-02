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
            /* Observable.create(fn) -> new Observable(fn) -> constructor(fn) { this.main = fn }
             * -> subscribe(observer) { return this.main(observer) }
             * 所以fn被赋给main，在subscribe中，this.main调用，即create(fn)，fn中的this指向create创建的那个对象 */ 
            const that = this;  
            return input.subscribe({
                next(v) {
                    const mapRtn = mapFn(v); // 若mapFn返回值是个observable时，也直接传入observer.next(v)
                    observer.next(mapRtn);
                },
                error: observer.error,
                complete: observer.complete
            });
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
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    merge(...observables) {
        return Observable.merge(this, ...observables);
    }

    mergeAll() {
        const input = this;
        return Observable.create(function (observer) {
            let index = 0;
            let inputCompleted = false;
            let allCompleted = false;
            const completes = [];
            const subscriptions = [];

            const subscriptionInput = input.subscribe({
                next(v) {
                    if (!(v instanceof Observable))
                        return;
                    
                    const subObservable = v;  // 当前面的map(arg => observable)，传入的值为observable时
                    const subIndex = index++;  // 暂存index的值

                    completes[subIndex] = false;
                    /* 每次map发出新observable时，由于当前observable并未完成，要将allCompleted重置为false，
                     * 若前面的都完成，按照下面的逻辑，allCompleted就变为true，此时再新发出observable时，allCompleted值就不对了
                     * completes数组本身不固定，是一直增加的，所以allCompleted只是表示当前加载的observable都完成了，
                     * 当新加载observable时，就要重置allCompleted = false */
                    allCompleted = false;

                    const subObserver = {
                        next: observer.next,
                        error: observer.error,
                        complete(arg) {
                            completes[subIndex] = true;

                            if (completes.every(completed => completed))
                                allCompleted = true;

                            /* 二阶observables至少有一个晚于一阶observable complete
                             * 一阶observable已经complete，且所有加载的二阶observables也都complete，就在最后这个完成的observable的
                             * complete中调用监听的observer.complete */
                            if (inputCompleted && allCompleted)
                                observer.complete(arg);
                        }
                    };

                    const subscription = subObservable.subscribe(subObserver);
                    subscriptions.push(subscription);
                },
                error: observer.error,
                complete(arg) {
                    inputCompleted = true;

                    // 一阶observable晚于所有二阶observables complete
                    // 一阶complete时，加载的二阶observables全都complete了，就在一阶observable的complete中调用observer.complete
                    if (allCompleted)
                        observer.complete(arg);
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscriptions.forEach(subscription => subscription.unsubscribe);
            };
        });
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

    combineLatest(project, ...observables) {
        return Observable.combineLatest(project, this, ...observables);
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
                },
                error: observer.error,
                complete(arg) {
                    observer.complete(arg);
                }
            });

            return subscription;
        });
    }

    concat(...observables) {
        return Observable.concat(this, ...observables);
    }

    race(...observables) {
        return Observable.race(this, ...observables);
    }

    startWith(startVal) {
        const input = this;
        return Observable.create(function (observer) {
            observer.next(startVal);
            return input.subscribe(observer);
        });
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

Observable.race = function (...observables) {
    return Observable.create(function (observer) {
        const length = observables.length;
        const subscriptions = [];
        let runAtLeastOnce = false;
        let sync = false;  // 默认同步为false

        for (let i = 0; i < length; i++) {
            subscriptions[i] = observables[i].subscribe({
                next(v) {
                    // next被同步调用时，下面的if (sync)会break循环，该observable必然为第一个，后面的都不需要订阅了
                    // 若异步调用时，就不会再进下面的if判断，全部都会被订阅，然后第一个发出值的observable将其他observable取消订阅即可
                    sync = true;

                    if (!runAtLeastOnce) {
                        for (let j = 0; j < observables.length; j++)
                            if (j !== i)
                                // 考虑到同步observable的情况，该同步observable之后的并未订阅，即subscription为undefined，所以要判断下subscription是否存在
                                subscriptions[j] && subscriptions[j].unsubscribe();

                        runAtLeastOnce = true;
                    }

                    observer.next(v);
                },
                error: observer.error,
                complete: observer.complete
            });

            if (sync)
                break;
        }

        return function () {
            // 并不能在next中放个变量记录被订阅的observable的index，假设全是异步observable，若有一个next调用之后，当然是可以的，
            // 但是如果想在所有next都没发出之前取消订阅，则必须全部取消，所以考虑所有情况全部取消一遍即可
            subscriptions.forEach(subscription => subscription && subscription.unsubscribe());
        };
    });
};

Observable.combineLatest = function (project, ...observables) {
    return Observable.create(function (observer) {
        const length = observables.length;
        const latestVals = new Array(length);
        const completes = new Array(length);
        const subscriptions = new Array(length);
        const hasRunAtLeastOnces = new Array(length);  // combineLatest当每个observable至少发出一个值才能发出第一个latest值
        let hasAllRunAtLeastOnce = false;

        completes.fill(false);
        hasRunAtLeastOnces.fill(false);

        observables.forEach((observable, index) => {
            subscriptions[index] = observable.subscribe({
                next(v) {
                    latestVals[index] = v;

                    /* 设立一个hasAllRunAtLeastOnce并把其放在上面判断是为了性能考虑，不然每次next都要遍历一次hasRunAtLeastOnces
                     * 所以当所有observable至少被调用一次之后，给hasAllRunAtLeastOnce赋个true，就不用遍历数组了，只要判断一个值
                     * 如果把其放到if(hasRunAtLeastOnces.every)后面判断，每次调用next还是会遍历数组，所以放前面提高性能 */
                    if (hasAllRunAtLeastOnce) {
                        observer.next(project(...latestVals));
                        return;
                    }

                    if (!hasRunAtLeastOnces[index])
                        hasRunAtLeastOnces[index] = true;

                    if (hasRunAtLeastOnces.every(hasRunAtLeastOnce => hasRunAtLeastOnce)) {  // 每个observable都运行至少一次
                        hasAllRunAtLeastOnce = true;
                        // 因为hasAllRunAtLeastOnce在上面先判断的，这里再赋值的，所以第一次会被漏掉，这里要手动调用
                        observer.next(project(...latestVals));
                    }
                },
                error: observer.error,
                complete(arg) {
                    completes[index] = true;
                    if (completes.every(completed => completed))
                        observer.complete(arg);
                }
            });
        });

        return function () {
            subscriptions.forEach(subscription => subscription.unsubscribe());
        };
    });
};

class Subject {
    constructor() {
        this.observers = [];
        this.completed = false;
    }

    subscribe(observer) {
        if (typeof observer !== 'object')
            throw new TypeError('Observer type error!');

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
        if (!this.completed) {
            this.observers.forEach(observer => observer.next && observer.next(v));
        }
    }

    error(err) {
        if (!this.completed) {
            this.observers.forEach(observer => observer.error && observer.error(err));
        }
    }

    complete(arg) {
        if (!this.completed) {
            this.completed = true;
            this.observers.forEach(observer => observer.complete && observer.complete(arg));
        }
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