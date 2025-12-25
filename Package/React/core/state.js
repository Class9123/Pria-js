import { currentEffect } from "../globals.js";
import { queueEffect } from "./dom.js";

export function useState(initialValue) {
  let value = initialValue;
  const effects = new Set();
  const getter = () => {
    if (currentEffect) {
      effects.add(currentEffect);
    }
    return value;
  };

  const setter = newValue => {
    const resolved =
      typeof newValue === "function" ? newValue(value) : newValue;
    if (resolved === value) return;
    value = resolved;
    queueEffect(effects);
  };

  return [getter, setter];
}

export function useArray(initialValue = []) {
  const array = [...initialValue];
  const effects = new Set();
  const getter = () => {
    if (currentEffect) {
      effects.add(currentEffect);
    }
    return array;
  };

  getter.push = item => { 
    array.push(item);
    const newEffects = [];
    for (const obj of effects)
      newEffects.push({
        fn: () =>
          obj.fn({
            push: true,
            index: array.length - 1
          }),
        cleanup: obj.cleanup
      });
    queueEffect(newEffects);
  };

  getter.setAt = (index, item) => {
    array[index] = item;
    const newEffects = [];
    for (const obj of effects)
      newEffects.push({
        fn: () =>
          obj.fn({
            setAt: true,
            index: index
          }),
        cleanup: obj.cleanup
      });
    queueEffect(newEffects);
  };

  getter.remove = index => {
    array.splice(index, 1);
    const newEffects = [];
    for (const obj of effects)
      newEffects.push({
        fn: () =>
          obj.fn({
            remove: true,
            index: index
          }),
        cleanup: obj.cleanup
      });
    queueEffect(newEffects);
  }; 

  getter.pop = () => {
    getter.remove(array.length - 1);
  };

  return getter;
}
