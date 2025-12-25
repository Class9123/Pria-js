
import {
  setCurrentEffect,
  currentEffect
} from "../globals.js";
import {
  queueEffect
} from "./dom.js";

export default function useMemo(fn) {
  let cachedValue;
  const effects = new Set();

  const compute = () => {
    cachedValue = fn();
  };

  const invalidate = () => {
    compute()
    queueEffect(effects);
  };

  function memo() {
    if (currentEffect) {
      ;
      effects.add(currentEffect);
    }
    return cachedValue;
  }

  const trackingEffect = {
    fn: invalidate,
    cleanup: null
  };

  setCurrentEffect(trackingEffect);
  compute();
  setCurrentEffect(null);

  return memo;
}