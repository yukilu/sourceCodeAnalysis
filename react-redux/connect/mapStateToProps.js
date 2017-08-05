import { wrapMapToPropsConstant, wrapMapToPropsFunc } from './wrapMapToProps';

// mapStateToProps = (state, ownProps) => ({ count: state.count });

export function whenMapStateToPropsIsFunction(mapStateToProps) {
  return (typeof mapStateToProps === 'function') ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps') : undefined;
}

export function whenMapStateToPropsIsMissing(mapStateToProps) {
  return (!mapStateToProps) ? wrapMapToPropsConstant(() => ({})) : undefined;
}

export default [whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing];
