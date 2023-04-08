const noop = () => {}

export const keysProxy = <T>(object: T): T =>
  new Proxy(noop, {
    get: (_target, p, _receiver) => innerKeysProxy(object, [p]),
  }) as T

const innerKeysProxy = (object: any, properties: (string | symbol)[]): unknown =>
  new Proxy(noop, {
    get(_target, p, _receiver) {
      object[properties.slice(-1)[0]] ??= isNaN(+p.toString()) ? {} : []
      return innerKeysProxy(object[properties.slice(-1)[0]], [...properties, p])
    },
    apply: (_target, _thisArg, _argArray) => properties,
  })
