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
        this.errored = false;
        this.next = this.next.bind(this);
        this.error = this.error.bind(this);
        this.complete = this.complete.bind(this);
    }

    next(v) {
        if (!this.completed && !this.errored)
            this._next && this._next(v);
    }

    error(err) {
        if (!this.completed && !this.errored) {
            this._error && this._error(err);
            this.errored = true;
        }
    }

    complete(arg) {
        if (!this.completed && !this.errored) {
            this._complete && this._complete(arg);
            this.completed = true;
        }
    }
}

class Observable {
    constructor(fn) {
        this.main = fn;
        this.defer = null;
    }

    subscribe(nextOrObserver, error, complete) {
        const defer = this.defer;
        let observer = null;
        let subscription = null;

        // 处理传入参数，保证observer的正确
        if (typeof observerOrNext === 'function')
            observer = new Observer(nextOrObserver, error, complete);
        else if (!nextOrObserver.isSubject)
            observer = new Observer(nextOrObserver);

        if (defer) {  // defer存在，就直接用deferFn的返回值来订阅observer，并将subscription返回
            let observable = defer();

            if (!(observable instanceof Observable)) {  // 若deferFn返回值不是Obervable实例，就重置为空observable
                console.warn('defer: return value of deferFn is not an instance of Observable!');
                observable = Observable.empty();
            }

            subscription = observable.subscribe(observer);
            return subscription;
        }
        
        let isCleared = false;
        const unsubscribeFn = this.main(observer);

        if (typeof unsubscribeFn === 'object')  // create中传入的fn返回值为subscription时
            subscription = unsubscribeFn;
        else if (typeof unsubscribeFn === 'function')
            subscription = {
                unsubscribe() {
                    if (isCleared)
                        return;

                    isCleared = true;
                    unsubscribeFn && unsubscribeFn();
                }
            };
        else // 返回值为undefined或者其他非对象非函数的值，unsubscribe设为空函数
            subscription = {
                unsubscribe() {}
            };

        return subscription;
    }

    multicast(subject) {
        return new Multicasted(this, subject);
    }

    do(doFn) {
        const input = this;
        // 此处的传入main函数中的observer并不是subscribe(observer)中的observer，而是由subscribe传入的observer经过
        // new Observer(observer)包装过的
        return Observable.create(function (observer) {
            return input.subscribe({
                next(v) {
                    doFn(v);
                    observer.next(v);
                },
                // 此处定义的原生error指向的是该函数返回的observable订阅原生observer时经Observer包装过的observer.error
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    empty(val) {
        return Observable.empty(val);
    }

    defaultIfEmpty(val) {
        const input = this;
        return Observable.create(function (observer) {
            let isEmpty = true;
            return input.subscribe({
                next(v) {
                    if (isEmpty)  // 防止第一次赋值后后续重复赋值
                        isEmpty = false;

                    observer.next(v);
                },
                error: observer.error,
                complete(arg) {
                    if (isEmpty && val !== undefined)
                        observer.next(val);

                    observer.complete(arg);
                }
            });
        });
    }

    isEmpty() {
        const input = this;
        return Observable.create(function (observer) {
            let empty = true;
            return input.subscribe({
                next(v) {
                    if (empty)  // 赋一次就够了，防止重复赋值
                        empty = false;
                },
                complete(arg) {
                    observer.next(empty);
                    observer.complete(arg);
                }
            });
        });
    }

    ignoreElements() {
        const input = this;
        return Observable.create(function (observer) {
            return input.subscribe({
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    scan(pureFn = count => count + 1, initial = 0) {
        const input = this;
        return Observable.create(function (observer) {
            let value = initial;

            return input.subscribe({
                next(v) {
                    value = pureFn(value, v);
                    observer.next(value);
                }
            });
        });
    }

    multiplyByTen() {
        const input = this;
        return Observable.create(function (observer) {
            return input.subscribe({
                next(v) {
                    observer.next(10 * v);
                },
                error: observer.error,
                complete: observer.complete
            });
        });
    }

    filter(filterFn = v => true) {
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

    every(everyFn = v => true) {
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

    sequenceEqual(...observables) {
        return Observable.sequenceEqual(this, ...observables);
    }

    find(findFn = v => true) {
        const input = this;
        return Observable.create(function (observer) {
            let first = true;

            return input.subscribe({
                next(v) {
                    // 只需要找到第一个符合findFn的值，并且将first放前面，找到第一个之后，后续的就不需要调用函数判断了
                    if (first && findFn(v)) {
                        first = false;
                        observer.next(v);
                        observer.complete();
                    }
                }
            });
        });
    }

    findIndex(findFn = v => true) {
        const input = this;
        return Observable.create(function (observer) {
            let first = true;
            let index = 0;

            return input.subscribe({
                next(v) {
                    if (first && findFn(v)) {
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

    skip(n = 0) {
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

    skipWhile(skipFilter = v => false) {
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

    elementAt(n = 0) {
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

    take(n = 0) {
        if (!n)
            return Observable.empty();

        const input = this;
        return Observable.create(function (observer) {
            let count = 0;

            const subscription = input.subscribe({
                next(v) {
                    count++;
                    observer.next(v);
                    if (count === n) {
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

    takeLast(n = 0) {
        const input = this;
        return Observable.create(function (observer) {
            const lasts = [];

            return input.subscribe({
                next(v) {
                    lasts.push(v);
                    if (lasts.length === n + 1)
                        lasts.shift();
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
                        observer.complete(arg);
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

    takeWhile(takeFilter = v => true) {
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

    map(mapFn = v => v) {
        const input = this;
        return Observable.create(function (observer) {
            /* Observable.create(fn) -> new Observable(fn) -> constructor(fn) { this.main = fn }
             * -> subscribe(observer) { return this.main(observer) }
             * 所以fn被赋给main，在subscribe中，this.main调用，即create(fn)，fn中的this指向create创建的那个对象 */ 
            const that = this;  
            let count = 0;
            return input.subscribe({
                next(v) {
                    /* try写在回调函数next最内部，错误本应在其最初的位置被捕获，出错时，直接调用observer.error，这样
                     * 便可知何处的代码对应何处的observer，try写外面，next是异步的时候，错误无法捕获，但try catch写
                     * 这里，下一个next不会被中断还是会执行，所以在Observer下添加了一个this.errored属性与this.completed
                     * 作用相同，即error后，当前observer的next都会被忽略，但input的next还是会继续调用 */
                    try {
                        const mapRtn = mapFn(v, count++); // 若mapFn返回值是个observable时，也直接传入observer.next(v)
                        observer.next(mapRtn);
                    } catch (err) {
                        observer.error(err);
                    }
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
                        complete(arg) {
                            completed = true;
                            if (inputCompleted)
                                observer.complete(arg);
                        }
                    });
                },
                error: observer.error,
                // observer.complete何时运行见audit中分析
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

    partition(filterFn = v => true) {
        const input = this;
        const observables = [];
        observables[0] = this.filter(filterFn);
        observables[1] = this.skipWhile(filterFn);

        return observables;
    }

    pluck(...attributes) {
        return this.map(v => attributes.reduce((obj, attribute) => obj[attribute], v));
    }

    repeat(n = 1) {
        const observables = new Array(n);
        observables.fill(this);
        return Observable.concat(...observables);
    }

    repeatInfinity() {
        const input = this;
        return Observable.create(function (observer) {
            let subscription;
            const observerInput = {
                next: observer.next,
                error: observer.error,
                complete(arg) {
                    subscription && subscription.unsubscribe();
                    subscription = input.subscribe(observerInput);
                }
            };

            subscription = input.subscribe(observerInput);

            return function () {
                subscription.unsubscribe();
            };
        });
    }

    audit(durationSelector) {
        const input = this;
        return Observable.create(function (observer) {
            let index = -1;
            let subscription;
            // 用来标记当前是否还有observable在运行，即next时候，值是否可以发射，
            // 或者用completed标记也可以，发射值时查看前面的observable是否已完成，效果是等同的
            let canLaunch = true;
            let latest;
            let inputCompleted = false;
            const subscriptionInput = input.subscribe({
                next(v) {
                    index++;
                    latest = v;

                    if (!canLaunch)
                        return;

                    canLaunch = false;
                    subscription && subscription.unsubscribe();
                    const observable = durationSelector(v, index);
                    subscription = observable.subscribe({
                        complete(arg) {
                            canLaunch = true;
                            observer.next(latest);

                            if (inputCompleted)
                                observer.complete(arg);
                        }
                    });
                },
                error: observer.error,
                complete(arg) {
                    /* 延时发射值的observable或者发射二阶observable时都存在一个问题，即当input(一阶observable)完成时，是否调用observer.complete
                     * 这个问题只需要在input完成时，对当前是否还存在运行的observable做判断
                     * 1. 若当前没有运行的observable了，由于input完成后不会再有值被发射，所以之前发射的observable都已完成
                     * 直接调用observer.complete
                     * 2. 若当前还有observable在运行，则在input.complete时不调用observer.complete，而在运行的observable中的最后
                     * 一个完成时调用observer.complete，而这种情况下，只需要在运行的observable的complete中判断
                     *   1) input未完成，则必然不调用observer.complete，因后面可能还会发射值，或者后面紧接着input完成，在input.complete
                     *   中调用observer.complete
                     *   2) input已完成，则只需要判断当前observable是否是最后一个完成的，若有多个，则用completes数组来独立标记每个完成
                     *   情况，都为true时，当前即为最后一个，若同一时间最多只有一个observable运行时，当前observable完成时即调用observer.complete
                     */
                    inputCompleted = true;
                    if (canLaunch)
                        observer.complete(arg);
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscription && subscription.unsubscribe();
            };
        });
    }

    throttle(durationSelector) {
        const input = this;  
        return Observable.create(function (observer) {
            let index = -1;
            let subscription;
            let canLaunch = true;
            const subscriptionInput = input.subscribe({
                next(v) {
                    index++;

                    if (!canLaunch)
                        return;

                    canLaunch = false;
                    observer.next(v);

                    subscription && subscription.unsubscribe();
                    const observable = durationSelector(v, index);
                    subscription = observable.subscribe({
                        complete() {
                            canLaunch = true;
                        }
                    });
                },
                error: observer.error,
                complete: observer.complete
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscription && subscription.unsubscribe();
            };
        });
    }

    debounce(durationSelector) {
        const input = this;
        return Observable.create(function (observer) {
            let subscription;
            // 用来标记当前是否还有未完成的observable，因为同一时间内只最多只可能有一个observable运行，所以用一个变量即可
            // 否则还得用completes数组，分别标记每个observable的情况才行
            let completed = true;
            let inputCompleted = false;
            const subscriptionInput = input.subscribe({
                next(v) {
                    /* 不论前一个值发出的observable完成与否，都需要做一下两件事
                     * 1. 将前一个observable取消订阅，若完成了就在取消之前调用了observer.next若未完成，则直接取消订阅，
                     * 就不会再调用complete，也就不会执行observer.next
                     * 2. 新发出一个observable，并订阅                                                               */
                    subscription && subscription.unsubscribe();
                    const observable = durationSelector(v);
                    completed = false;  // 每次发射即重置为false，表示当前还有未完成的observable
                    subscription = observable.subscribe({
                        complete() {
                            completed = true;  // 表示发射的observable已完成
                            observer.next(v);

                            if (inputCompleted)
                                observer.complete(arg);
                        }
                    });
                },
                error: observer.error,
                // observer.complete何时运行见audit中分析
                complete(arg) {
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

    /* audit，throttle，debounce，sample区别
     * audit,throttle,debounce都是在能发射值的时候，发射值并同时执行一个给定的observable，而sample是一个与input并列执行的observable
     * 1. audit和throttle
     * audit和throttle都是属于节流类型的，即在从input发出值时，若当前没有observable执行，即发出的为第一个值或前面的observable已经完成，
     * 就发出值，并同时开始执行给定的observable，该observable从开始到其complete这个时间段的距离内，只会发出一个值，
     * 区别在于，audit在这个阶段内，是在complete时发出从input缓存的最新值，而throttle在这个阶段内，是在开始时就发出开始的值
     * 2. debounce
     * debouce是比较前后两个发射值的距离，若小于指定值(即前一个值发出时，开始执行的observable还没完成，就发出后一个值)，就取消
     * 前一个的observable，并忽略前一个值，用后一个值来取代，如此不停比较前后两个发射值的距离，直到某一个值与后一个值距离大于
     * 指定值时(即前一个值发出时开始执行的observable完成时，下一个值还没发射)，在其对应的observable执行complete时，将该值发出
     * 3. sample
     * sample不同于上述三个函数，sample有一根取样时间线(observable)与input并列执行，在取样时间线发射值时，就把从input流缓存的最新值发射出去
     */

    auditTime(time = 1000) {
        // return this.audit(v => Observable.timer(time));
        
        const input = this;
        return Observable.create(function (observer) {
            let latest;
            let timeoutId;
            let canLaunch = true;
            let inputCompleted = false;
            let completed = true;

            const subscriptionInput = input.subscribe({
                next(v) {
                    latest = v;

                    if (!canLaunch)
                        return;

                    canLaunch = false;
                    timeoutId = setTimeout(() => {
                        canLaunch = true;
                        observer.next(latest);

                        if (inputCompleted)
                            observer.complete();
                    }, time);
                },
                error: observer.error,
                complete(arg) {
                    inputCompleted = true;

                    if (canLaunch)
                        observer.complete(arg);
                }
            });

            return function () {
                if (timeout !== undefined)
                    clearTimeout(timeoutId);
                subscriptionInput.unsubscribe();
            };
        });
    }

    // a值发出后time时间段内的值都省略，超过这段时间后再发出第二个值b，b值发出后time时间段内的值省略，超过这个时间段发出第三个值c...
    throttleTime(time = 1000) {  // 节流 即一段时间内只发出第一个值
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

    debounceTime(time = 1000) {  // debounce 去抖动，即用新值刷新旧值
        /* return this.debounce(v => Observable.timer(time));
         * 不用上面代码写的原因还是定时器不稳定的因素，特别是一阶observable的complete和二阶observable的发射数据在同一时间节点上时，
         * 谁先谁后是不一定的，所以同一个代码运行几次的结果可能都不同，而直接在input事件流中判断时间不会发生上述问题，运行几次输出
         * 的结果基本都是相同的，throttleTime同理 */

        const input = this;
        return Observable.create(function (observer) {
            let lastTime = 0;
            let currentTime = 0;
            let timeoutId = -1;
            let inputCompleted = false;
            let completed = true;
            const subscriptionInput = input.subscribe({
                next(v) {
                    currentTime = Date.now();

                    if (currentTime - lastTime < time)
                        clearTimeout(timeoutId);

                    completed = false;
                    timeoutId = setTimeout(() => {
                        completed = true;
                        observer.next(v);
                        if (inputCompleted)
                            observer.complete();
                    }, time);

                    lastTime = currentTime;
                },
                complete(arg) {
                    inputCompleted = true;
                    if (completed)
                        observer.complete(arg);
                }
            });

            return function () {
                clearTimeout(timeoutId);
                subscriptionInput.unsubscribe();
            };
        });
    }

    /* 当是input也是个定时器时，若设定的time为input的周期的倍数或者input的周期为time的倍数时，发射数据时会在相同时间节点上相遇
     * 这时候由于定时器可能是通过多线程跑的，加入js主线程的消息队列时，先后顺序并不确定，所以会出现相同代码取样不同的情况
     * 因此最好将time的值适当加个1，如用1001代替1000，2501替代2500，当然这么做取样数很大时就会由误差
     * 同时要指出的是，由于定时器本身并不稳定，定时器加入的回调函数何时运行取决于js主线程的具体情况，所以sample函数也是不稳定的 */
    sampleTime(time = 1000) {
        const interval = Observable.interval(time);
        return this.sample(interval);
    }

    buffer(observable) {
        const input = this;

        return Observable.create(function (observer) {
            let buffer = [];
            let completed = false;
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

    bufferTime(time = 1000) {
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
        if (typeof project === 'object')  // project为observable时，要调整下传参顺序，不然输出结果时数组前两个值顺序会颠倒
            return Observable.zip(this, project, ...observables);
        return Observable.zip(project, this, ...observables);
    }

    combineLatest(project, ...observables) {
        if (typeof project === 'object') // 同上
            return Observable.combineLatest(this, project, ...observables);
        return Observable.combineLatest(project, this, ...observables);
    }

    // 缓存input发出的所有二阶observable，然后在input完成时，将所有缓存的二阶observables通过同时发出并通过combineLatest打平
    combineAll() {
        const input = this;
        return Observable.create(function (observer) {
            let subscriptions;
            const observables = [];
            const subscriptionInput = input.subscribe({
                next(v) {
                    const observable = v;
                    observables.push(observable);
                },
                error: observer.error,
                complete(arg) {
                    subscriptions = Observable.combineLatest((...args) => args, ...observables).subscribe(observer);
                }
            });

            return function () {
                subscriptions.unsubscribe();
                subscriptionInput.unsubscribe();
            };
        });
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

    delay(time = 1000) {
        const input = this;
        if (!time)
            return this;

        return Observable.create(function (observer) {
            const ids = [];
            const subscription = input.subscribe({
                next(v) {
                    // 同步observable用setTimeout顺序也是对的，可能用setTimeout同时执行时按次序先后加入，是准的，
                    // setTimeout稳定性比setInterval好些
                    const id = setTimeout(() => {
                        observer.next(v);
                        ids.shift();  //  因为都是延迟一样的时间，所以和队列一样，先进的先完成，完成时只需要将最前面的删除即可
                    }, time);

                    ids.push(id);
                },
                error: observer.error,
                complete(arg) {  // complete也延迟time时间
                    const id = setTimeout(() => {
                        observer.complete(arg);
                        ids.shift();  // 同上
                    }, time);

                    ids.push(id);
                }
            });

            return function () {
                subscription.unsubscribe();
                ids.forEach(id => clearTimeout(id));  // 可能中途取消订阅，所以设置的定时器也要清除
            };
        });
    }

    delayWhen(delayDurationSelector) {
        const input = this;
        return Observable.create(function (observer) {
            let count = 0;
            const subscriptions = [];
            const completes = [];
            let inputCompleted = false;
            const subscriptionInput = input.subscribe({
                next(v) {
                    let first = true;
                    const index = count++;
                    const observable = delayDurationSelector(v, index);  // 传入input发射的值及当前值的序号
                    completes[index] = false;
                    const subscription = observable.subscribe({
                        next(subVal) {
                            if (first) {  // 设置first是为了判定是否第一次调用，第一次才执行下面代码，为了防止同步observable重复调用下面代码
                                first = false;
                                subscription && subscription.unsubscribe();  // 当前observable发射第一个数据时，取消当前observable的订阅
                                completes[index] = true;  // 第一次发射值，该observable就完成了

                                observer.next(v);
                                /* 1.input没完成之前observer.complete必定不会调用
                                 * 2.input完成后，由于不会再有新值发射，所以在每个delay的observable发射第一个值时判断当前存在的observable
                                 * 是否都完成了
                                 *   1) 没有全部完成，则还有observable在运行
                                 *   2) 已全部完成，则当前observable为最后一个，调用observer.complete */
                                if (inputCompleted && completes.every(completed => completed))
                                    observer.complete();
                            }
                        }
                    });
                    subscriptions.push(subscription);
                },
                eror: observer.error,
                complete(arg) {
                    inputCompleted = true;
                    /* observer.complete何时调用存在两种情况，在input的complete调用时，判断已经发射的值经过delay后是否都完成了
                     * 因为input.complete后，不会再有值发射，所以input.complete时，只要判定已经存在的值
                     * 1. 若都完成了，则在observer.complete中调用
                     * 2. 若还有未完成的，则在input.complete之后的那些observable中最后一个发射值的那个observable.next时调用 */
                    if (completes.every(completed => completed))
                        observer.complete(arg);
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscriptions.forEach(subscription => subscription.unsubscribe());
            };
        });
    }

    // 与combineLatest不同，combineLatest任意一根时间线发射数据都会结合其他时间线的最新数据来执行observe.next，而withLastestFrom
    // 只是以input为主轴，只有当主时间线发射数据时，才会结合当前其他时间线的最新数据来执行observer.next
    withLatestFrom(project, ...observables) {
        const input = this;
        const type = typeof project;
        const temp = project;
        
        if (type !== 'function') {
            console.warn(`withLatestFrom: project must be a function ,but now is ${type}`);
            project = (...args) => args;
        }

        if (type === 'object')
            observables.unshift(temp);
            
        return Observable.create(function (observer) {
            let length = observables.length;
            let latests = new Array(length);
            latests.fill(undefined);
            let allHasRunAtLeastOnce = false;
            const subscriptions = [];
            const subscriptionInput = input.subscribe({
                next(v) {
                    if (allHasRunAtLeastOnce) {
                        observer.next(project(v, ...latests));
                        return;
                    }

                    if (latests.every(latest => latest !== undefined)) {  // 第一次latests都有值时，进这里
                        allHasRunAtLeastOnce = true;
                        // allHasRunAtLeastOnce赋为true时，也是第一次latest都有值，要运行第一次next，第二次开始就进上面那个if
                        // 这里写这么麻烦是为了避免每次都要遍历数组，符合条件之后直接用一个变量标记，取代一直遍历数组
                        observer.next(project(v, ...latests));
                    }
                },
                error: observer.error,
                complete: observer.complete
            });

            observables.forEach((observable, index) => {
                subscriptions[index] = observable.subscribe({
                    next(v) {
                        latests[index] = v;
                    }
                });
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscriptions.forEach(subscription => subscription.unsubscribe());
            };
        });
    }

    // observable创建时，就已经将其要做的next,error,complete等事都排好了，所以observable一但创建，其执行方式无法修改，observable
    // 只能处理已经安排好的事，如果要考虑未来让其执行next等，只能换用subject来处理，正如此处的window函数中
    window(windowBoundaries) {
        const input = this;
        return Observable.create(function (observer) {
            let subject = new Subject();
            observer.next(subject);

            const subscriptionInput = input.subscribe({
                // 写成next: subject.next是不对的，首先subject中的this若没绑定subject，就会在调用时指向observer.next的observer，
                // 其次，这样就将next固定到初始的subject.next上了，其实subject指向的对象是会变的，所以只能用函数包一层
                next(v) {
                    subject.next(v);
                },
                error: observer.error,
                complete(arg) {
                    subject.complete();
                    observer.complete(arg);
                }
            });

            const subscription = windowBoundaries.subscribe({
                next(v) {
                    subject.complete();
                    subject = new Subject();
                    observer.next(subject);
                }
            });

            return function () {
                subscription.unsubscribe();
                subscriptionInput.unsubscribe();
            };
        });
    }

    windowCount(n = 1) {
        const input = this;
        if (!n)
            return this;

        return Observable.create(function (observer) {
            let count = 0;
            let subject;

            return input.subscribe({
                next(v) {
                    if (!count++) {  // count === 0
                        subject = new Subject();
                        observer.next(subject);
                    }

                    subject.next(v);
                    if (count === n) {
                        count = 0;
                        subject.complete();
                    }
                },
                error: observer.error,
                complete(arg) {
                    subject && subject.complete();
                    observer.complete(arg);
                }
            });
        });
    }

    windowToggle(opening, closingSelector) {
        const input = this;
        return Observable.create(function (observer) {
            let subjects = [];
            let subscriptions = [];

            const subscriptionInput = input.subscribe({
                next(v) {
                    subjects.forEach(subject => subject.next(v));
                },
                error: observer.error,
                complete(arg) {
                    subjects.forEach(subject => subject.complete());
                    observer.complete(arg);
                }
            });

            const subscriptionOpening = opening.subscribe({
                next(v) {
                    const subject = new Subject();
                    observer.next(subject);
                    subjects.push(subject);

                    const subscriptionClosingSelector = closingSelector.subscribe({
                        complete(arg) {
                            subject.complete();
                        }
                    });
                    subscriptions.push(subscriptionClosingSelector);
                }
            });

            return function () {
                subscriptionInput.unsubscribe();
                subscriptionOpening.unsubscribe();
                subscriptions.forEach(subscriptionClosingSelector => {
                    subscriptionClosingSelector && subscriptionClosingSelector.unsubscribe();
                });
            };
        });
    }

    windowWhen(closingSelector = () => Observable.timer(2000)) {
        const input = this;
        return Observable.create(function (observer) {
            let subscription;
            let subject = new Subject();
            observer.next(subject);

            const subscriptionInput = input.subscribe({
                next(v) {
                    subject.next(v);
                },
                error: observer.error,
                complete(arg) {
                    subject.complete();
                    observer.complete(arg);
                    subscription && subscription.unsubscribe();
                }
            });

            const observerClosing = {
                complete(arg) {
                    const observable = closingSelector();

                    subject.complete();
                    subscription && subscription.unsubscribe();
                    subscription = observable.subscribe(observerClosing);
                    subject = new Subject();
                    observer.next(subject);
                }
            };

            const observableClosing = closingSelector();
            subscription = observableClosing.subscribe(observerClosing);

            return function () {
                subscription.unsubscribe();
                subscriptionInput.unsubscribe();
            };
        });
    }

    catch(selector) {
        const input = this;
        return Observable.create(function (observer) {
            let subscription;
            let subscriptionInput;
            subscriptionInput = input.subscribe({
                next: observer.next,
                error(err) {
                    try {
                        const observable = selector();
                        subscription = observable.subscribe(observer);
                    } catch (err) {
                        observer.error(err);
                    }
                },
                complete: observer.complete
            });
            

            return function () {
                subscription && subscription.unsubscribe();
                subscriptionInput && subscriptionInput.unsubscribe();
            };
        });
    }

    observeOn(scheduler = 'async') {
        const input = this;

        if (scheduler === 'async')
            return Observable.create(function (observer) {
                return input.subscribe({
                    next(v) {
                        setTimeout(() => observer.next(v), 0);
                    },
                    error: observer.error,
                    complete(arg) {
                        setTimeout(() => observer.complete(arg), 0);
                    }
                });
            });

        return Observable.empty();
    }
}

Observable.create = function (fn) {
    const type = typeof fn;
    if (type !== 'function') {  // fn不是函数时，返回空observable，并发出警告
        console.warn(`create: you must pass a funtion, but the type of what you have passed is ${type}!`);
        return Observable.empty();
    }

    return new Observable(fn);
};

Observable.defer = function (deferFn) {
    if (typeof deferFn !== 'function') {
        console.warn('defer: deferFn is not a function!');
        deferFn = () => Observable.empty();
    }

    const observable = Observable.empty();
    observable.defer = deferFn;

    return observable;
};

// fn = (a, b, c, callback) { do something with a,b,c then callback(...args) }
Observable.bindCallback = function(fn, selector) {
    return function (...args) {
        return Observable.create(function (observer) {
            if (typeof selector !== 'function') {
                console.warn('bindCallback: selector is not a function!');
                selector = function (...args) {
                    const length = args.length;
                    if (!length)
                        return;
                    if (length === 1)
                        return args[0];
                    return args;
                }
            }

            fn(...args, (...args) => {
                observer.next(selector(...args));
                observer.complete();
            });
        });
    };
};

// fn形式如上，只是callback要是node形式的回调 (err, result) { ... }
Observable.bindNodeCallback = function(fn, selector) {
    return function (...args) {
        return Observable.create(function (observer) {
            if (typeof selector !== 'function') {
                console.warn('bindCallback: selector is not a function!');
                selector = function (...args) {
                    const length = args.length;
                    if (!length)
                        return;
                    if (length === 1)
                        return args[0];
                    return args;
                }
            }

            fn(...args, (err, ...args) => {
                if (err) {
                    observer.error(err);
                    return;
                }

                observer.next(selector(...args));
                observer.complete();
            });
        });
    };
};

Observable.empty = function (val) {
    return Observable.create(function (observer) {
        if (val !== undefined)
            observer.next(val);
        observer.complete();
    });
};

Observable.never = () => Observable.create(observer => {});

Observable.throw = err => Observable.create(observer => {
    observer.error(err);
});

Observable.from = function (array) {
    return Observable.create(observer => {
        try {
            array.forEach(item => observer.next(item));
            observer.complete();
        } catch (err) {
            observer.error(err);
        }
    });
};

Observable.of = (...args) => Observable.from(args);

Observable.fromEvent = function (node, type) {
    return Observable.create(observer => {
        listener = ev => { observer.next(ev); };
        node.addEventListener(type, listener, false);

        return function () {
            node.removeEventListener(type, listener);
        };
    });
};

Observable.fromPromise = function (promise) {
    return Observable.create(function (observer) {
        promise.then(v => {
            observer.next(v);
            observer.complete();
        }, err => {
            observer.error(err);
        });
    });
};

Observable.interval = time => Observable.intervalStartFrom(0, time);

Observable.intervalRandom = function (start, end) {
    return Observable.create(function (observer) {
        let index = 0;
        let id;
        const duration = end - start;

        function random() {
            observer.next(index++);
            // 定时器回调自身，形成无限回调，效果同interval，只要定时器被清除一次，就断了
            id = setTimeout(random, start + duration * Math.random());
        }

        id = setTimeout(random, start + duration * Math.random());  // 启动setTimeout回调函数

        return function () {
            clearTimeout(id);
        };
    });
};

Observable.intervalStartFrom = function (startNum, time) {
    return Observable.create(observer => {
        let n = startNum;
        const id = setInterval(() => observer.next(n++), time);

        return function () {
            clearInterval(id);
        };
    });
};

Observable.intervalNow = time => Observable.intervalStartNowFrom(0, time);

Observable.intervalStartNowFrom = function (startNum, time) {
    return Observable.create(observer => {
        let n = startNum;
        observer.next(n);
        const id = setInterval(() => observer.next(++n), time);

        return function () {
            clearInterval(id);
        };
    });
};

Observable.intervalFrom = function (array, time) {
    return Observable.create(function (observer) {
        let i = 0;
        const length = array.length;

        if (!length) {  // length === 0，直接complete
            observer.complete();
            return;
        }

        const id = setInterval(() => {
            observer.next(array[i++]);

            if (i === length) {
                clearInterval(id);
                observer.complete();
            }
        }, time);

        return function () {
            if (typeof id !== 'undefined')
                clearInterval(id);
        };
    });
};

Observable.intervalNowFrom = function (array, time) {
    return Observable.create(function (observer) {
        let i = 0;
        const length = array.length;
        if (!length) {  // length === 0，直接complete
            observer.complete();
            return;
        }

        observer.next(array[0]);
        if (length === 1) {  // 只有一个数时，不需要定时器，next之后直接complete
            observer.complete();
            return;
        }

        const id = setInterval(() => {
            observer.next(array[++i]);

            if (i === length - 1) {
                clearInterval(id);
                observer.complete();
            }
        }, time);

        return function () {
            if (typeof id !== 'undefined')
                clearInterval(id);
        };
    });
};

Observable.range = function (start = 0, end = 0) {
    const array = [];
    const length = end - start + 1;
    for (let i = 0; i < length; i++)
        array[i] = start + i;

    return Observable.from(array);
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
    const length = observables.length;
    if (!length || length === 1) {  // observables没传或只传了一个时，认为是相等的
        console.warn(`sequenceEqual: pass only ${length} observable, please pass at least two!`);
        return Observable.empty(true);
    }

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
    const length = observables.length;
    if (!length) {  // merge没有observable传入时，返回空observable
        console.warn('merge: you don\'t pass any observable, please pass at least two!');
        return Observable.empty();
    }
    if (length === 1) {  // 只有一个observable传入时，不用比较，返回传入的值即可
        console.warn('merge: you pass only one observable, please pass at least two!');
        return observables[0];
    }

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
    if (!length) {  // 没有observable时，返回空observable
        console.warn('concat: you don\'t pass any observable, please pass at least two!');
        return Observable.empty();
    }
    if (length === 1) {  // 只有一个observable传入时，返回传入值
        console.warn('concat: you pass only one observable, please pass at least two!');
        return observables[0];
    }

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
    const type = typeof project;
    const temp = project;
    if (type !== 'function') {  // project不是函数时，重置为默认函数，并发出警告
        console.warn(`zip: project should be a function, but the type now is ${type}!`);
        project = (...args) => args;
    }

    if (type === 'object') // project为observable时，project就用默认函数
        observables.unshift(temp);

    const length = observables.length;
    for (let i = 0; i < length; i++)  // observables中有非Observable类型的值时，返回空observable，并发出警告
        if (!(observables[i] instanceof Observable)) {
            console.warn('zip: all of observables must be instances of Observable!');
            return Observable.empty();
        }

    
    if (!length) {  // 没有传入值时，返回空observable
        console.warn('zip: you don\'t pass any observable, please pass at least one!');
        return Observable.empty();
    }

    // 只有一个值传入时，下面代码效果是一样的，就不用再多余重写一个 length === 1 的情况，而且本身一个observable的zip也说的通
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

Observable.combineLatest = function (project, ...observables) {
    const type = typeof project;
    const temp = project;
    if (type !== 'function') {  // project不是函数时，赋为默认值，并且发出警告
        console.warn('combineLatest: project should be a function, but the type now is ${type}!');
        project = (...args) => args;
    }

    if (type === 'object')  // project为observable时，将其推入observables的最前面
        observables.unshift(temp);

    const length = observables.length;
    for (let i = 0; i < length; i++)  // observables有非Observalbe类型的值时，返回空observable，并发出警告
        if (!(observables[i] instanceof Observable)) {
            console.warn('combineLatest: all of observables must be instances of Observable!');
            return Observable.empty();
        }

    
    if (!length) {  // 没有传入参数时，返回空observable，并发出警告
        console.warn('combineLatest: you don\'t pass any observable, please pass at least two!');
        return Observable.empty();
    }
    if (length === 1) {  // 只有一个observable传入时，返回传入的值，并发出警告，因只有一个observable调用该函数没意义
        console.warn('combineLatest: you pass only one observable, please pass at least two!');
        return Observables[0];
    }

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

Observable.race = function (...observables) {
    const length = observables.length;
    if (!length) {  // 没有observable传入时，返回空observable，并发出警告
        console.warn('race: you don\'t pass any observable, please pass at least one!');
        return Observable.empty();
    }
    if (length === 1)  // 只有一个observable传入时，返回传入的值
        return observables[0];

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

class Subject extends Observable {
    constructor() {
        super();
        this.observers = [];
        this.completed = false;
        this.errored = false;

        this.next = this.next.bind(this);
        this.error = this.error.bind(this);
        this.complete = this.complete.bind(this);
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
        if (!this.completed && !this.errored) {
            this.observers.forEach(observer => observer.next && observer.next(v));
        }
    }

    error(err) {
        if (!this.completed && !this.errored) {
            this.errored = true;
            this.observers.forEach(observer => observer.error && observer.error(err));
        }
    }

    complete(arg) {
        if (!this.completed && !this.errored) {
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