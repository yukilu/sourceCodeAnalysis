/* update相关的生命周期函数为四个，更新组件时，一般会用到这四个函数，但是初始化时，这四个函数不会被调用
 * 1. componentWillReceiveProps(nextProps) {...}
 * 一般setState时不会调用当前组件的componentWillReceiveProps
 * 2. shouldComponentUpdate(nextProps) {...}
 * 默认返回true，返回fasle时，不会调用componentWillUpdate，componentDidUpdate函数
 * 3. componentWillUpdate(nextProps) {...}
 * 4. componentDidUpdate(nextProps) {...}
 */
 
// B组件定义如下
class B extends Component {
    render() {
        return <p>B</p>;
    }
}

//当调用A组件的setState来重新渲染组件时，存在以下三种情况
//1. render函数返回值中直接有下层组件，如下，会向下传导，并层层往下传递更新，重新渲染，见示例update_directRender.jsx
class A extends Component {
    render() {
        return (
            <div>
                <p>A</p>
                <B/>
            </div>
        );
    }
}

render(<A/>, document.getElementById('root'));

//2. render函数返回值通过this.props.children来传递组件，此时A组件setState时，只有A组件会更新，而并不会传导至B组件
//B及往下组件均不会更新，见示例update_children.jsx
class A extends Component {
    render() {
        return (
            <div>
                <p>A</p>
                {this.props.children}
            </div>
        );
    }
}

render(<A><B/></A>, document.getElementById('root'));

//3. 挂载了context时，不论render函数中是直接返回B还是通过this.props.children传递B，都会层层往下更新
//而且，B组件中并不需要声明contextTypes，更新一样会传导到B，并层层往下，见示例update_context.jsx
class A extends Component {
    static childContextTypes = { a: PropTypes.number };
    getChildContext() {
        return { a: 0 };
    }
    render() {
        return (
            <div>
                <p>A</p>
                {this.props.children}
            </div>
        );
    }
 }

/* 当只通过props.children传导组件时，setState不会往下传导更新，而直接返回B或者有context存在时，会层层向下传导更新
 * 分析以上三种情况，可以分为两类：
 * 1. render函数返回值中直接包含B，或有context存在
 * 这种情况下，当前组件的变化，可能会引起下层组件的变化，因为在当前组件中，可以在render中向B组件传递props，野可以通过修改context
 * 上挂载的值，使得下层组件获取的context上的值发生变化，引起组件的变化，所以这种情况下，当前组件变化时，必须向下层层更新
 * 2. render函数返回值中通过props.children间接传递组件，并且不存在context
 * 这种情况下，由于render函数中通过props.children来间接传递组件，而通过props.children传递组件时，是无法向其传入props的
 * 所以当前组件变化时，是不会影响到通过props.children传递的组件的，所以这种情况就没必要再更新这个通过props.children传递
 * 的下层组件了，也就不会向下层层更新了
 *
 * 要说一下的是，在react-redux中，由于Provider和connectAdvanced中都使用了context，所以render时无论是否使用children来传递组件
 * 都是可以层层往下更新的
 */