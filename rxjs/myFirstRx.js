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
        else  // typeof unsubscribeFn === 'function' || unsubscribeFn === undefined
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

    defaultIfEmpty(val) {
        const input = this;
        return Observable.create(function (observer) {
            let isEmpty = true;
            return input.subscribe({
                next(v) {
                    if (isEmpty)  // 防止第一次赋值后后续重复赋值
                        isEmpty = false;

                    observer.next(v)
                },
                error: observer.error,
                complete(arg) {
                    if (isEmpty)
                        observer.next(val);

                    observer.complete(arg);
                }
            });
        });
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
        return Observable.create(function (observer) {
            let value = inital;

            return input.subscribe({
                next(ev) {
                    observer.next(value);
                    value = pureFn(value);
                }
            });
        });
    }

    multiplyByTen() {
        const input = this;
        return Observable.create(function (observer) {
            const subscription = input.subscribe({ next: v => observer.next(10 * v) });
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
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    every(everyFn) {
        const input = this;
        return Observable.create(function (observer) {
            let result = true;

            return input.subscribe({
                next(v) {
                    if (!everyFn(v))
                        result = false;
                },
                error: observer.error,
                complete(arg) {
                    observer.next(result);
                    observer.complete(arg);
                }
            });
        });
    }

    sequenceEqual(...observable) {
        return Observable.sequenceEqual(this, ...observable);
    }

    find(findFn) {
        const input = this;
        return Observable.create(function (observer) {
            let first = true;

            return input.subscribe({
                next(v) {
                    if (findFn(v) && first) {
                        first = false;
                        observer.next(v);
                        observer.complete();
                    }
                }
            });
        });
    }

    findIndex(findFn) {
        const input = this;
        return Observable.create(function (observer) {
            let first = true;
            let index = 0;

            return input.subscribe({
                next(v) {
                    if (findFn(v) && first) {
                        first = false;
                        observer.next(index);
                        observer.complete();
                    }

                    index++;
                }
            });
        });
    }

    first() {
        const input = this;
        return Observable.create(function (observer) {
            let firstExist = false;
            let subscription;
            subscription = input.subscribe({
                next(v) {
                    if (firstExist)  // 同步observable无法unsubscribe，所以只能在这里判断，从第二次开始就没必要执行下面的代码了，直接return
                        return;

                    firstExist = true;
                    subscription && subscription.unsubscribe();

                    observer.next(v);
                    observer.complete();
                },
                error: observer.error,
                complete(arg) {
                    if (!firstExist)
                        observer.complete(arg);
                }
            });

            return function() {
                subscription.unsubscribe();
            };
        });
    }

    last() {
        const input = this;
        return Observable.create(function (observer) {
            let lastVal;

            return input.subscribe({
                next(v) {
                    lastVal = v;
                },
                complete(arg) {
                    observer.next(lastVal);
                    observer.complete(arg);
                }
            });
        });
    }

    skip(n) {
        const input = this;
        return Observable.create(function (observer) {
            let index = 0;

            return input.subscribe({
                next(v) {
                    if (index++ < n)
                        return;

                    observer.next(v);
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    skipUntil(observable) {
        const input = this;
        return Observable.create(function (observer) {
            let launched = false;

            const subscriptionInput = input.subscribe({
                next(v) {
                    if (launched)
                        observer.next(v);
                },
                error: observer.error,
                complete: observer.commplete
            });

            const subscription = observable.subscribe({
                next(v) {
                    launched = true;
                    // observable为同步时，调用该next函数时，subscription为undefined，所以要判断是否存在，异步时，为订阅后的subscription
                    subscription && subscription.unsubscribe();
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscription.unsubscribe();
            };
        });
    }

    skipWhile(skipFilter) {
        const input = this;
        return Observable.create(function (observer) {
            return input.subscribe({
                next(v) {
                    if (!skipFilter(v))
                        observer.next(v);
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    distinct() {
        const input = this;
        return Observable.create(function (observer) {
            const vals = [];

            return input.subscribe({
                next(v) {
                    if (vals.indexOf(v) !== -1)
                        return;

                    vals.push(v);
                    observer.next(v);
                },
                error: observer.next,
                complete: observer.complete
            });
        });
    }

    distinctUntilChanged() {
        const input = this;
        return Observable.create(function (observer) {
            let latest;

            return input.subscribe({
                next(v) {
                    if (latest === v)
                        return;

                    latest = v;
                    observer.next(v);
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    elementAt(n) {
        const input = this;
        return Observable.create(function (observer) {
            let index = 0;

            return input.subscribe({
                next(v) {
                    if (index++ === n) {
                        observer.next(v);
                        observer.complete();
                    }
                }
            });
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
                        /* 将subscription放在前面，再调用complete，是为了防止complete出错时，中止函数，造成unsubscribe无法调用
                         * unsubscribe调用后，由于当前next下代码已经执行，都会执行完，complete也会执行，下次next由于unsubscribe，
                         * 就没有next的回调了，就不会执行了 */
                        subscription && subscription.unsubscribe();
                        observer.complete(); 
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

    takeLast(n) {
        const input = this;
        return Observable.create(function (observer) {
            const lasts = [];

            return input.subscribe({
                next(v) {
                    if (lasts.length = n)
                        lasts.shift();

                    lasts.push(v);
                },
                error: observer.error,
                complete(arg) {
                    observer.next(lasts);
                    observer.complete(arg);
                }
            });
            
        });
    }

    takeUntil(observable) {
        const input = this;
        return Observable.create(function (observer) {
            let canLaunch = true;
            let completeRunned = false;

            const subscriptionInput = input.subscribe({
                next(v) {
                    if (canLaunch)
                        observer.next(v);
                },
                error: observer.error,
                complete(arg) {
                    if (!completeRunned) {
                        completeRunned = true;
                        observer.complete();
                    }
                }
            });

            const subscription = observable.subscribe({
                next(v) {
                    canLaunch = false;

                    if (!completeRunned) {
                        completeRunned = true;
                        observer.complete();
                    }
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscription.unsubscribe();
            };
        });
    }

    takeWhile(takeFilter) {
        const input = this;
        return Observable.create(function (observer) {
            return input.subscribe({
                next(v) {
                    if (takeFilter(v))
                        observer.next(v);
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    count(countFn = v => true) {
        const input = this;
        return Observable.create(function (observer) {
            let count = 0;

            return input.subscribe({
                next(v) {
                    if (countFn(v))
                        count++;
                },
                error: observer.error,
                complete(arg) {
                    observer.next(count);
                    observer.complete(arg);
                }
            });
        });
    }

    max() {
        const input = this;
        return Observable.create(function (observer) {
            // 要找最大值，赋个最小值，最大值为Number.MAX_VALUE，则最小值为-Number.MAX_VALUE，注意Number.MIN_VALUE的值是最小的正数，无限接近于0
            let max = -Number.MAX_VALUE;

            return input.subscribe({
                next(v) {
                    if (v > max)
                        max = v;
                },
                error: observer.error,
                complete(arg) {
                    observer.next(max);
                    observer.complete(arg);
                }
            });
        });
    }

    min() {
        const input = this;
        return Observable.create(function (observer) {
            let min = Number.MAX_VALUE;

            return input.subscribe({
                next(v) {
                    if (v < min)
                        min = v;
                },
                error: observer.error,
                complete(arg) {
                    observer.next(min);
                    observer.complete(arg);
                }
            });
        });
    }

    reduce(reduceFn, initial) {
        const input = this;
        return Observable.create(function (observer) {
            let result = initial;
            let hasRunAtLeastOnce = false;

            return input.subscribe({
                next(v) {
                    if (!hasRunAtLeastOnce && initial === undefined) { // 第一次运行且并未给定初值
                        result = v;
                        hasRunAtLeastOnce = true;
                        return;
                    }

                    result = reduceFn(result, v);  // 第二次之后或第一次运行且给定初值
                },
                error: observer.error,
                complete(arg) {
                    observer.next(result);
                    observer.complete(arg);
                }
            });
        });
    }

    map(mapFn) {
        const input = this;
        return Observable.create(function (observer) {
            /* Observable.create(fn) -> new Observable(fn) -> constructor(fn) { this.main = fn }
             * -> subscribe(observer) { return this.main(observer) }
             * 所以fn被赋给main，在subscribe中，this.main调用，即create(fn)，fn中的this指向create创建的那个对象 */ 
            const that = this;  
            let count = 0;
            return input.subscribe({
                next(v) {
                    const mapRtn = mapFn(v, count++); // 若mapFn返回值是个observable时，也直接传入observer.next(v)
                    observer.next(mapRtn);
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    mapTo(val) {
        // return this.map(() => val);
        const input = this;
        return Observable.create(function (observer) {
            return input.subscribe({
                next(v) {
                    observer.next(val);
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

    mergeMap(mapFn) {
        return this.map(mapFn).mergeAll();
    }

    mergeMapTo(observable) {
        return this.mapTo(observable).mergeAll();
    }

    concat(...observables) {
        return Observable.concat(this, ...observables);
    }

    concatAll() {
        const input = this;
        return Observable.create(function (observer) {
            let inputCompleted = false;
            let subscription;
            let canRun = true;
            const observablesBuffer = [];

            const subObserver = {
                next: observer.next,
                error: observer.error,
                complete(arg) {
                    const observableStored = observablesBuffer.shift();

                    /* 具体情况分为三种
                     * 1. observablesBuffer中还有缓存值，直接订阅该缓存值
                     * 2. observablesBuffer为空，即没有缓存值，继续判断input是否完成
                     *   1) input已经完成了，则当前observable为最后一个，complete时，直接执行observer.complete
                     *   2) input未完成，则前面缓存的所有observable都以完成，等待input下一个值发射或直接complete
                     */
                    if (observableStored) {  // observable缓存数组中有值，直接订阅下一个缓存值
                        subscription && subscription.unsubscribe();  // 将之前的subscription进行unsubscribe，防止出现问题
                        subscription = observableStored.subscribe(subObserver);
                    }
                    // observable缓存数组中没有值，且input已经完成，因为当前observable在input完成后才完成，input完成后就不会再往
                    // 缓存数组中缓存值，所以当在input完成后，且observable缓存数组为空时，当前observable即为最后一个
                    else if (inputCompleted)
                        observer.complete(arg);
                    // observable缓存数组中没有值，input未完成，说明之前发射的observable都完成了，但是还没到下一个observable发射
                    // 或input的complete，就把下一次发射时是判断否能直接订阅的canRun赋为true
                    else
                        canRun = true;
                }
            };

            const subscriptionInput = input.subscribe({
                next(v) {
                    if (!(v instanceof Observable))
                        return;

                    const observable = v;

                    // 判断canRun，若为true，则前面的observable都运行结束了，可以直接订阅，为false，则前面的observable还没结束，缓存起来
                    if (canRun) {
                        canRun = false;
                        subscription && subscription.unsubscribe();
                        subscription = observable.subscribe(subObserver);
                    } else
                        observablesBuffer.push(observable);
                },
                complete(arg) {
                    inputCompleted = true;
                    if (canRun)  // canRun为true，说明前面发射的observable都完成了，可以直接complete，否则就忽略
                        observer.complete(arg);
                }
            });

            return function () {
                subscription && subscription.unsubscribe();
                subscriptionInput.unsubscribe();
            };
        });
    }

    concatMap(mapFn) {
        return this.map(mapFn).concatAll();
    }

    concatMapTo(observable) {
        return this.mapTo(observable).concatAll();
    }

    switch() {
        const input = this;
        return Observable.create(function (observer) {
            let inputCompleted = false;  // 判断一阶observable是否完成
            let completed = true;  // 由于任意时刻至多只有一个二阶observable在运行，所以用一个completed来判断当前observable是否完成就够
            let subscription;

            const subscriptionInput = input.subscribe({
                next(v) {
                    if (!(v instanceof Observable))
                        return;

                    const observable = v;
                    // 新发出一个observable时，就将completed重置为false，
                    // 并且直接将前一个observable进行unsubscribe，不论其存在与否，完成与否
                    completed = false;
                    subscription && subscription.unsubscribe();
                    subscription = observable.subscribe({
                        next: observer.next,
                        error: observer.error,
                        /* 因为同一时间只可能存在至多一个observable运行，所以当其完成后，判断input是否完成，若已经完成，由于input
                         * 完成后不会再发出值，所以当前observable为最后一个，调用observer.complete，若未完成，则忽略，因为后面input
                         * 可能还会再发射observable，或者直接complete */
                        complete(arg) {
                            completed = true;
                            if (inputCompleted)
                                observer.complete(arg);
                        }
                    });
                },
                error: observer.error,
                // input完成时，判断是否还有observable在运行，若有，则忽略input的complete，当当前observable完成时调用observer.complete
                // 若没有，由于input完成后不再有observable被发射，所以直接调用observer.complete
                complete(arg) {
                    inputCompleted = true;
                    if (completed)
                        observer.complete(arg);
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscription && subscription.unsubscribe();
            };
        });
    }

    switchMap(mapFn) {
        return this.map(mapFn).switch();
    }

    switchMapTo(observable) {
        return this.mapTo(observable).switch();
    }

    pairwise() {
        const input = this;
        return Observable.create(function (observer) {
            let first = true;
            let last;
            return input.subscribe({
                next(v) {
                    if (first) {
                        first = false;
                        last = v;
                        return;
                    }

                    const pair = [last, v];
                    observer.next(pair);
                    last = v;
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    pluck(...attributes) {
        return this.map(v => attributes.reduce((obj, attribute) => obj[attribute], v));
    }

    repeat(n = 1) {
        const observables = new Array(n);
        observables.fill(this);
        return Observable.concat(...observables);
    }

    debounce(debounceFn) {
        const input = this;
        const subscriptions = [];
        let completed = true;
        let lastSubscription;

        return Observable.create(function (observer) {
            const subscriptionInput = input.subscribe({
                next(v) {
                    /* 判断前一个值发出的observable的complete状态
                     * 若为未完成状态，则当前值在前一个observable.complete前发射，需要取消前一个observable，则其complete不执行，
                     * observer.next也不执行
                     * 若为完成态，则当前值在前一个observable.complete后发射，前一个complete已经执行，引起observer.next的执行 */
                    if (!completed)
                        lastSubscription.unsubscribe();

                    // 不论前一个值发出的observable完成与否，都需要新发出一个observable，并订阅，且重置当前observable的状态为未完成
                    const observable = debounceFn(v);
                    completed = false;
                    lastSubscription = observable.subscribe({
                        complete() {
                            completed = true;
                            observer.next(v);
                        }
                    });
                },
                error: observer.error,
                complete: observer.complete
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscriptions.forEach(subscription => subscription.unsubscribe());
            };
        });
    }

    throttle(throttleFn) {
        const input = this;
        const subscriptions = [];
        let canLaunch = true;

        return Observable.create(function (observer) {
            const subscriptionInput = input.subscribe({
                next(v) {
                    if (!canLaunch)
                        return;

                    canLaunch = false;
                    observer.next(v);

                    const observable = throttleFn(v);
                    const subscription = observable.subscribe({
                        complete() {
                            canLaunch = true;
                        }
                    });

                    subscriptions.push(subscription);
                },
                error: observer.error,
                complete: observer.complete
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscriptions.forEach(subscription => subscription.unsubscribe());
            };
        });
    }

    /* a值发出time时间段内无值发出，则time时间段后发出当前值，若a值发出time时间段内发出b值，则抛弃a值，看b值发出time时间段内是否
     * 有值发出，无值则发出b值，若有c值发出，抛弃b值，判断c值发出time时间段内是否有值发出，无则发出c值，有则抛弃c值，继续判断后续值
     * 即a值发出time时间段内判断是否有b值发出，无则发出a值，有就继续判断后续值...，直到出现某值x在time时间段内无值发出，发出值x */
    debounceTime(time) {  // debounce 去抖动，即用新值刷新旧值
        /* return this.debounce(v => Observable.timer(time));
         * 不用上面代码写的原因还是定时器不稳定的因素，特别是一阶observable的complete和二阶observable的发射数据在同一时间节点上时，
         * 谁先谁后是不一定的，所以同一个代码运行几次的结果可能都不同，而直接在input事件流中判断时间不会发生上述问题，运行几次输出
         * 的结果基本都是相同的，throttleTime同理 */

        const input = this;
        return Observable.create(function (observer) {
            let lastTime = 0;
            let currentTime = 0;
            let timeoutId = -1;
            return input.subscribe({
                next(v) {
                    currentTime = Date.now();

                    if (currentTime - lastTime < time)
                        clearTimeout(timeoutId);

                    timeoutId = setTimeout(() => {
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
        // 不这么写的理由同debounceTime
        // return this.throttle(v => Observable.timer(time));
        
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

    sample(observable) {
        const input = this;
        return Observable.create(function (observer) {
            let latest = null;
            let index = -1;
            let lastIndex = -2;
            let subscription = null;
            let sync = false;  // input可能是个同步observable，默认false是异步observable

            // input为同步observable时，这里的代码直接同步执行，即在下面取样observable订阅前就执行
            const subscriptionInput = input.subscribe({
                next(v) {
                    latest = v;
                    index++;
                },
                error: observer.error,
                complete(arg) {
                    // input为同步observable时，此处complete同步执行，sync直接被赋值为true，下面if代码判断就会是true
                    sync = true;
                    observer.complete(arg);
                    subscription && subscription.unsubscribe();
                }
            });

            /* input为同步observable时，上面的complete同步调用，执行顺序在下面代码之前，sync直接被赋值为true，此时取样observable还没订阅，
             * input就已经complete，所以没必要再取样，直接跳过取样observable的订阅
             * input为异步observable时，上面的complete异步调用，执行顺序在下面代码之后，所以sync为false，取样observable正常订阅 */
            if (!sync) {
                subscription = observable.subscribe({
                    next(v) {
                        if (index === lastIndex)
                            return;

                        lastIndex = index;
                        observer.next(latest);
                    }
                });
            }

            return function () {
                subscriptionInput.unsubscribe();
                subscription && subscription.unsubscribe();
            };
        });
    }

    /* 当是input也是个定时器时，若设定的time为input的周期的倍数或者input的周期为time的倍数时，发射数据时会在相同时间节点上相遇
     * 这时候由于定时器可能是通过多线程跑的，加入js主线程的消息队列时，先后顺序并不确定，所以会出现相同代码取样不同的情况
     * 因此最好将time的值适当加个1，如用1001代替1000，2501替代2500，当然这么做取样数很大时就会由误差
     * 同时要指出的是，由于定时器本身并不稳定，定时器加入的回调函数何时运行取决于js主线程的具体情况，所以sample函数也是不稳定的 */
    sampleTime(time) {
        const interval = Observable.interval(time);
        return this.sample(interval);
    }

    buffer(observable) {
        const input = this;
        let buffer = [];
        let completed = false;

        return Observable.create(function (observer) {
            const subscriptionInput = input.subscribe({
                next(v) {
                    buffer.push(v);
                },
                error: observer.error,
                // input和observable谁先完成就直接调用observer.complete，为了防止重复调用complete要做判断处理
                // input先完成，就把observable unsubscribe，observable.complete也不会调用，input后完成，complete不需要再重复调用
                complete(arg) {
                    if (!completed)
                        observer.complete(arg);
                    subscriptionTrigger && subscriptionTrigger.unsubscribe();
                }
            });

            const subscriptionTrigger = observable.subscribe({
                next(v) {
                    observer.next(buffer);
                    buffer = [];
                },
                complete(arg) {  // observable的complete先完成时，要将最后一次缓存的数据发出去
                    completed = true;
                    observer.next(buffer);
                    observer.complete(arg);
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscriptionTrigger && subscriptionTrigger.unsubscribe();
            };
        });
    }

    bufferCount(bufferSize, startBufferEvery) {
        const input = this;
        return Observable.create(function (observer) {
            let index = 0;
            let count = 0;
            let buffer = [];

            return input.subscribe({
                next(v) {
                    buffer[count++] = v;

                    if (count === bufferSize) {
                        count = 0;
                        // Array.from生成新数组，是因为每次next修改的可能是上一个数组的值，而数组传递的又是指针，会造成得到的数组可能被后续修改
                        observer.next(Array.from(buffer));

                        if (++index % startBufferEvery === 0)  // 每startBufferEvery个数组，新建一个数组缓冲数据
                            buffer = new Array(bufferSize);
                    }
                },
                error: observer.error,
                complete(arg) { 
                    // count的值只能是[0, bufferSize - 1]，因为在next中，count为bufferSize时，必然会将数组发出
                    // 而由于上面先赋值，count再++，所以count的值即为数组长度
                    
                    /* const lastVals = [];
                     * for (let i = 0; i < count; i++)
                     *     lastVals[i] = buffer[i];    */
                    const lastVals = buffer.slice(0, count);  // 效果与上面的循环相同，slice(0, 0)为空数组，slice(i, i)结果就是空数组

                    observer.next(lastVals);
                    observer.complete(arg);
                }
            });
        });
    }

    bufferTime(time) {
        // return Observable.buffer(Observable.interval(time));
        
        // 这里还是存在定时器不稳定的问题，而且官方版的rxjs也存在这个问题
        const input = this;
        return Observable.create(function (observer) {
            let buffer = [];

            const id = setInterval(() => {
                observer.next(buffer);
                buffer = [];
            }, time);

            const subscription = input.subscribe({
                next(v) {
                    buffer.push(v);
                },
                error: observer.error,
                complete(arg) {
                    clearInterval(id);
                    observer.complete(arg);
                }
            });

            return function () {
                clearInterval(id);
                subscription.unsubscribe();
            };
        });
    }

    bufferToggle(opening, closing) {
        const input = this;
        return Observable.create(function (observer) {
            let paired = true;
            let buffering = false;
            let buffer;

            const subscriptionOpening = opening.subscribe({
                next(v) {
                    /* 对pair进行判断是为了防止opening重复发出，比如连发两个的情况，
                     * 在opening当前发射的值中，若paired为false，表示还未配对，即前一个发射值的还属于opening，忽略当前值
                     * 若paired是true，表示上一对配对了，即前一个发射的值属于closing，当前值可以作为起始 */
                    if (paired) {
                        paired = false;
                        buffering = true;
                        buffer = [];
                    }
                }
            });

            const subscriptionClosing = closing.subscribe({
                next(v) {
                    /* 同上，为了防止closing重复发出
                     * 在closing当前发射的值中，做paired为true，表示已经配对，即前一个发射的值还属于closing，忽略当前值
                     * 若paired为false时，表示未配对，即前一个发射的值属于opening，当前值可以作为结束 */
                    if (!paired) {
                        paired = true;
                        buffering = false;
                        observer.next(buffer);
                    }
                }
            });

            const subscriptionInput = input.subscribe({
                next(v) {
                    if (buffering)
                        buffer.push(v);
                },
                error: observer.error,
                complete(arg) {
                    observer.complete(arg);
                    subscriptionOpening.unsubscribe();
                    subscriptionClosing.unsubscribe();
                }
            })

            return function () {
                subscriptionOpening.unsubscribe();
                subscriptionClosing.unsubscribe();
            };
        });
    }

    bufferWhen(closingSelector) {
        const input = this;
        return Observable.create(function (observer) {
            let observable = closingSelector();
            let completed = false;
            let buffer = [];
            let subscription;
            // 判断closingSelector返回的observable及input是否为同步observable，若为同步，都没意义，next中直接return
            let syncInput = true;
            let syncObservable = true;
            let runOnce = true;

            let subObserver = {
                next(v) {
                    // 同步时，这里的值为true，异步时，该函数在这里代码运行完之后运行，下面已经赋为false
                    if (syncObservable) {
                        if (runOnce) {
                            runOnce = false;
                            console.warn('bufferWhen: closingSelector can\'t return a sync observable.');
                        }
                        return;  // 用return来切断连续订阅调用，只要有一个observable为同步，即停止后续订阅
                    }

                    observer.next(buffer);
                    buffer= [];
                    subscription && subscription.unsubscribe();  // 取消当前observable

                    observable = closingSelector();  // 创建新observable，并再订阅自己
                    syncObservable = true;  // 重置syncObservable，因为每次新返回的observable都可能是重复的，要重新判断
                    // 再订阅自己，执行过程类似于递归，无限进行，所以要在input.complete中unsubscribe，不然会内存溢出
                    subscription = observable.subscribe(subObserver);
                    syncObservable = false;
                }
            };

            subscription = observable.subscribe(subObserver);
            syncObservable = false;  // 这一行不要忘记加，因为第一次判断是否同步时依赖这个赋值

            const subscriptionInput = input.subscribe({
                next(v) {
                    if (syncInput)  // 原理同上
                        return;

                    buffer.push(v);
                },
                error: observer.error,
                complete(arg) {
                    observer.complete(arg);
                    subscription.unsubscribe();  // 完成时将当前observable进行unsubscribe，不然observable会一个接一个无限递归下去
                }
            });

            syncInput = false;  // 同步时，上面的if(sync)在该赋值表达式之前运行，if判断为true，异步时，在该赋值后运行，if判断为false

            return function () {
                subscription.unsubscribe();
                subscriptionInput.unsubscribe();
            }
        });
    }

    zip(project, ...observables) {
        return Observable.zip(project, this, ...observables);
    }

    combineLatest(project, ...observables) {
        return Observable.combineLatest(project, this, ...observables);
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

Observable.empty = function (arg) {
    return Observable.create(function (observer) {
        observer.complete(arg);
    });
};

Observable.from = function (array) {
    return Observable.create(observer => {
        array.forEach(item => observer.next(item));
        observer.complete();
    });
};

Observable.of = function (...args) {
    return Observable.from(args);
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
    return Observable.intervalStartFrom(0, time);
};

Observable.intervalStartFrom = function(startNum, time) {
    return Observable.create(observer => {
        let n = startNum;
        const id = setInterval(() => observer.next(n++), time);

        return function () {
            clearInterval(id);
        };
    });
};

Observable.intervalFrom = function (array, time) {
    return Observable.create(function (observer) {
        let i = 0;
        const length = array.length;
        const id = setInterval(() => {
            observer.next(array[i++]);

            if (i === length) {
                clearInterval(id);
                observer.complete();
            }
        }, time);

        return function () {
            clearInterval(id);
        };
    });
};

Observable.timer = function (beginTime, time) {
    return Observable.create(function (observer) {
        let n = 1;
        let intervalId;
        const timeoutId = setTimeout(() =>  {
            observer.next(0);
            if (time === undefined)
                observer.complete();
            else
                intervalId = setInterval(() => observer.next(n++), time);
        }, beginTime);
        
        return function () {
            clearTimeout(timeoutId);
            if (interval !== undefined)
                clearInterval(intervalId);
        };
    });
}

// 用数组存储所有发出的数，然后进行判断，不对所有数组的0位置及之后位置都储存数据时删除，但是发出数据数量不能过多，
// 不然数组长度过长会造成性能问题，处理长度过长时，可以像下面那种写法，设定一个特定长度，超过时再新建数组存储
Observable.sequenceEqual = function (...observables) {
    return Observable.create(function (observer) {
        const SIZE = 100;
        const length = observables.length;
        const indexes = new Array(length);
        const completes = new Array(length);
        const arrays = [];
        const subscriptions = [];
        let isEqual = true;

        indexes.fill(-1);
        completes.fill(false);
        for (let i = 0; i < length; i++)
            arrays[i] = [];

        for (let i = 0; i < length; i++)
            subscriptions[i] = observables[i].subscribe({
                next(v) {
                    if (!isEqual)  // 如果已经判定为不相等了，那下面的代码就没必要运行了
                        return;

                    indexes[i]++;
                    arrays[i].push(v);

                    const currentIndex = indexes[i];
                    // 成立时，arrays每一个数组的index位都存在数据，当前数组是最后一个在该位push数据的，对该位所有数据进行操作
                    if (indexes.every(index => index >= currentIndex)) {
                        const item = arrays[0][currentIndex];
                        for (let j = 1; j < length; j++)
                            if (arrays[j][currentIndex] !== item) {
                                isEqual = false;
                                break;
                            }

                        // 嵌套在上层if内，是为了保证所有数组储存的数据长度都达到或超过了SIZE
                        if (currentIndex === SIZE - 1) {
                            for (let j = 0; j < length; j++)
                                arrays[j] = arrays[j].slice(SIZE);
                        }
                    }
                },
                error: observer.error,
                complete(arg) {
                    completes[i] = true;
                    if (completes.every(completed => completed)) {
                        for (let j = 0; j < length - 1; j++)
                            if (arrays[j].length !== arrays[j + 1].length) {
                                isEqual = false;
                                break;
                            }

                        observer.next(isEqual);
                        observer.complete(arg);
                    }
                }
            });

        return function () {
            subscriptions.forEach(subscription => subscription.unsubscribe());
        };
    });
};

// 与zip写法类似，0位置的数都存在时，就处理所有0位置的数，然后将0位置的数全部shift删除，以保证发出数据数量过多时，数组长度不会过长
Observable.sequenceEqualLikeZip = function (...observables) {
    return Observable.create(function (observer) {
        const length = observables.length;
        const indexes = new Array(length);
        const completes = new Array(length);
        const arrays = new Array(length);
        const subscriptions = new Array(length);
        let isEqual = true;

        indexes.fill(-1);
        completes.fill(false);
        for (let i = 0; i < length; i++)
            arrays[i] = [];

        for (let i = 0; i < length; i++)
            subscription[i] = observable[i].subscribe({
                next(v) {
                    if (!isEqual)  // 如果isEqual为false，即已经判定不相等了，next下的代码都不需要执行了
                        return;

                    indexes[i]++;  // 这里的index，array[i]添加删除数据的逻辑与zip函数相同
                    array[i].push(v);

                    if (indexes.every(index => index !== -1)) {
                        const item = array[0][0];
                        array[0].shift();
                        indexes[0]--;

                        for (let j = 1; j < length; j++) {
                            if (array[j][0] !== item) {
                                isEqual = false;
                                break;
                            }

                            array[j].shift();
                            indexes[j]--;
                        }
                    }
                },
                error: observer.error,
                complete(arg) {
                    completes[i] = true;

                    if (completes.every(completed => completed)) {  // 最后一个完成的observable调用complete时调用observer.complete
                        // isEqual为true时需要进一步判断observable发射数据的长度，不相等时，认为是不相等的，但isEqual本就为false时，不需要判断
                        if (isEqual && indexes.some(index => index !== -1))
                            isEqual = false;

                        observer.next(isEqual);
                        observer.complete(arg);
                    }
                }
            });

        return function () {
            subscriptions.forEach(subscription => subscription.unsubscribe());
        };
    });
}

// 通过zip来判断每个对应位置的元素是否相等，但是无法判断长度是否相等，除非修改zip函数，例如在zip中每个observable监听的complete中添加
// observer.next(rest)，即在zip生成的observable的complete时发射一个布尔变量来标示是否多余数据
Observable.sequenceEqualSameLength = function (...observables) {
    function equal(...args) {
        const item = args[0];
        return args.every(arg => arg === item);
    }

    return Observable.create(function (observer) {
        let isEqual = true;
        return Observable.zip(equal, ...observables).subscribe({
            next(v) {
                if (!v)
                    isEqual = false;
            },
            error: observer.error,
            complete(arg) {
                observer.next(isEqual);
                observer.complete(arg);
            }
        });
    });
}

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
    const length = observables.length;
    if (!length)
        return Observable.empty();

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
        const indexes = new Array(length);
        const completes = new Array(length);
        const arrays = [];
        const subscriptions = [];

        indexes.fill(-1);
        completes.fill(false);
        for (let i = 0; i < length; i++)
            arrays[i] = [];

        for (let i = 0; i < length; i++)
            subscriptions[i] = observables[i].subscribe({
                next(v) {
                    indexes[i]++;  // 每次发射数据时，对当前对应的序号先++，然后push(v)，index指向当前位，该位存在数据
                    arrays[i].push(v);

                    /* 没有一个index指向-1，即没有数组为空，满足条件时即当前的observable对应最后一个将数据push进去的空数组
                     * 这种情况下0位都存在数据，将所有0位数据存储进vals数组，然后全部删除，序号全部减一
                     * 有点像俄罗斯方块，这种方法只有0位能全部满数据，全满就全部删除，这样操作总能保证数据全满在0位置
                     *     0    1    2           0    1    2            0    1    2
                     * 0  v00  v01  v02      0  v00  v01  v02      -0  v01  v02
                     * 1  v10  v11      ->   1  v10  v11       ->  -1  v11
                     * 2                    +2  v20                -2
                     */
                    if(indexes.every(index => index !== -1)) {
                        const vals = [];

                        for (let j = 0; j < length; j++) {
                            vals[j] = arrays[j][0];
                            arrays[j].shift();
                            indexes[j]--;
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
                                // 考虑到同步observable的情况，该同步observable之后的并未订阅，即subscription为undefined，
                                // 所以要判断下subscription是否存在
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