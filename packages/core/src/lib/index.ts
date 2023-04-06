
import { get, writable } from 'svelte/store'
import type { z } from 'zod'

type InputEvent = Event & { currentTarget: EventTarget & HTMLInputElement }

type CreateFormOptions<T> = {
  initialData?: T,
  schema?: z.ZodSchema<T>
}

type FieldError = {
  path: (string | number)[]
  message: string
}

export function createForm<T>(options?: CreateFormOptions<T>) {
  const data = writable<T>(options?.initialData)
  const errors = writable<FieldError[]>([])
  const dirty = writable<Record<string, boolean>>({})

  /**
   * Svelte action to register a field.
   */
  const field = (node: HTMLElement, proxyCallback: (t: T) => any) => {
    const inputNode = node as HTMLInputElement

    const handleChange = (event: Event) => {
      const e = event as InputEvent

      /**
       * Mutate this data to update the current data.
       */
      const newData = (get(data) ?? {}) as T

      /**
       * Create a draft proxy around the original object.
       */
      const draft = createDraftProxy(newData)

      /**
       * The callback actually indexes the draft object; 
       * invoking the function at that property will set the value in the original object.
       */
      const keys = proxyCallback(draft)(e.currentTarget.value)

      dirty.update(current => ({ ...current, [keys.join('.')]: true }))

      if (!options?.schema) {
        return data.set(newData)
      }

      const parseResult = options.schema.safeParse(newData)

      if (parseResult.success) {
        return data.set(parseResult.data)
      } 
      else {
        errors.set(parseResult.error.errors.filter((e) => {
          return Object.keys(dirty).includes(e.path.join('.'))
        }))
      }
    }

    if (inputNode.type === 'text') {
      node.addEventListener('input', handleChange)
    } else {
      node.addEventListener('change', handleChange)
    }

    return {
      destroy() {
        node.removeEventListener('change', handleChange)
        node.removeEventListener('input', handleChange)
      }
    }
  }

  /**
   * Svelte action to register an error.
   */
  const error = (node: HTMLElement, name: (t: T) => any) => {
    errors.subscribe(current => {
      const newErrors: any = current
      const draft = createDraftProxy(newErrors)
      const keys = name(draft)()
      const matchingErrors = current.filter(error => error.path.join('.').includes(keys.join('.')))
      node.innerHTML = matchingErrors.map(error => error.message).join('')
    })
  }

  return { data, errors, field, error }
}

const noop = () => {}

function createDraftProxy<T>(y: T) {
  const draftProxy = new Proxy(noop, {
      get: (_target, prop) => {
        return createInnerProxy(y, [prop])
      },
  }) as T
  return draftProxy
}

function createInnerProxy(prev: any, keys: (string | symbol)[]): unknown {
  const lastKey = keys[keys.length - 1]
  return new Proxy(() => {}, {
    get(_target, prop) {
      prev[lastKey] ??= isNaN(+prop.toString()) ? {} : []
      return createInnerProxy(prev[lastKey], [...keys, prop])
    },
    apply(_target, _thisArg, argArray) {
      if (argArray[0] !== undefined) {
        prev[lastKey] = argArray[0]
      }
      return keys
    },
  })
}
