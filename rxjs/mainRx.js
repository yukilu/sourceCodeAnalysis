/* 这个mainRx是将Rx的observable与subject结合了，因为observable每次subscribe(observer)时，都会启动一个新的函数，即每次调用subscribe时
 * 都会生成新的事件流，事件流之间是相互独立的
 * const observable = Observable.create(fn);  observable.subscribe(observer);  observable.subscribe(anotherObserver);
 * 即使是同一个observable监听不同的observer，会启动独立的事件流，互不影响
 * 
 * 此处的mianRx，当调用run启动时，只会生成一个事件流，subscribe(observer)更像是subject中的多播，同一个observable不论监听多少个不同的
 * observer，都对应同一个事件流，即上面run启动的那个，即subscribe(observer)时，observer.next(v)中传入的值，为run启动的那个事件流
 * 的当前值，而不是新启动一个事件流 */

// Observable.create(function (observers) {...}); observers的真正对象类型，observers并非为数组，参数中用observers是想使其看起来更像是observer的集合
// 在Observable中将上面参数observers的值挂载到this.observerGroup上，为了避免与this.observerGroup.observers混淆
class ObserverGroup {
    constructor(observers) {
        this.observers = observers || [];  // Observers上主要是挂载了observers数组

        this.completed = false;
        this.next = this.next.bind(this);  // 调用Observers的实例上的next函数，就会将this.observers上的数组中的observer逐个调用
        this.error = this.error.bind(this);
        this.complete = this.complete.bind(this);
    }

    add(observer) {
        this.observers.push(observer);
    }

    remove(observer) {
        const observers = this.observers;
        const index = observers.indexOf(observer);
        observers.splice(index, 1);
    }

    next(v) {
        if (!this.completed)
            this.observers.forEach(observer => observer.next && observer.next(v));
    }

    error(err) {
        if (!this.completed)
            this.observers.forEach(observer => observer.error && observer.error());
    }

    complete(arg) {
        if (!this.completed) {
            this.completed = true;
            this.observers.forEach(observer => observer.complete && observer.complete());
        }
    }
}

class Observable {
    constructor(fn) {
        this.main = fn;
        this.observerGroup = new ObserverGroup();
    }

    // 用来启动this.main函数运行
    run() {
        let subscription = null;
        let isCleared = false;
        const unsubscribeFn = this.main(this.observerGroup);
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

    // observerGroup.observers数组添加observer，同时返回的函数调用时，从数组中删除该observer
    subscribe(observer) {
        let isCleared = false;
        const observerGroup = this.observerGroup;
        observerGroup.add(observer);

        return {
            unsubscribe() {
                if (isCleared)
                    return;

                isCleared = true;
                observerGroup.remove(observer);
            }
        };
    }
}

Observable.create = function (fn) {
    return new Observable(fn);
};

Observable.interval = function (time) {
    return Observable.create(function (observers) {
        let index = 0;
        const intervalId = setInterval(() => {
            observers.next(index++);
        }, time);

        return function () {
            clearInterval(intervalId);
        };
    });
};

const observer = { next: v => console.log('a ' + v) };
const observer1 = { next: v => console.log('b ' + v) };

const interval = Observable.interval(1000);
interval.subscribe(observer);

setTimeout(() => {
    interval.subscribe(observer1);
}, 3500);

interval.run();