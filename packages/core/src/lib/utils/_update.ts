type Primitive = string | number | boolean | null | undefined

function _isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function _isPrimitive(value: unknown): value is Primitive {
  return !_isRecord(value) && !Array.isArray(value)
}

function _update<Data>(obj: Data | undefined, path: string | string[], value: any) {
  const copy = structuredClone(obj ?? ({} as Data))

  const splitPath = !Array.isArray(path) ? path.match(/[^.[\]]+/g) || [] : path

  const lastSection = splitPath[splitPath.length - 1]

  if (!lastSection) return copy

  let i = 0
  let property: any = copy
  let section = splitPath[i]

  for (; i < splitPath.length - 1; property = property[section], section = splitPath[++i]) {
    if (_isPrimitive(property[section])) {
      property[section] = isNaN(+splitPath[i + 1]) ? {} : []
    }
  }

  property[lastSection] = value

  return copy
}

export default _update
