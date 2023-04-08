type Primitive = string | number | boolean | null | undefined

/*
 * https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
 */
function _get<Data, Default = undefined>(
  obj: Data,
  path: string,
  defaultValue?: Default
): Default | Primitive | Primitive[] {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res: any, key) => (res !== null && res !== undefined ? res[key] : res), obj)
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/)
  return result === undefined || result === obj ? defaultValue : result
}

export default _get
