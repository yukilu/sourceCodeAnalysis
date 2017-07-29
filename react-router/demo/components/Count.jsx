function Counter(props, context) {
    const { count, increase, decrease } = props;
    return (
        <div>
            <p>{count}</p>
            <button onClick={increase}>+</button><br/>
            <button onClick={decrease}>-</button>
        </div>
    );
}

Counter.contextTypes = { store: PropTypes.object };

export default Counter;