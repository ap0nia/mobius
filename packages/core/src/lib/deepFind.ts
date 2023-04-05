/**
 * Set a deeply nested property on an object.
 * @param obj The object to set the property on.
 * @param path The path to the property, represented as a dot separated string.
 * @returns The mutated original object.
 */
export function deepFind<T>(obj: T = Object.create(null), path: string) {
  /**
   * Convert any stringified numbers in the path to numbers (i.e. for arrays).
   */
  const keys = path.split('.').map(k => isNaN(+k) ? k : +k)

  /**
   * The last key in the path is the property we want to set.
   */
  const lastKey = keys.slice(-1)[0]

  let penultimate: any = obj
  for (let i = 0; i < keys.length - 1; penultimate = penultimate[keys[i++]]) {
    // if current key is not defined, set it to an array or empty object
    penultimate[keys[i]] ??= !isNaN(+keys[i + 1]) ? [] : {}
  }
  return { penultimate, lastKey }
}
