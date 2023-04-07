
import { get, writable } from 'svelte/store'
import type { z } from 'zod'

type InputEvent = Event & { currentTarget: EventTarget & HTMLInputElement }

type CreateFormOptions<T> = {
  initialData?: T | Promise<T>,
  schema?: z.ZodSchema<T>
}

type FieldError = {
  node: HTMLElement
  path: (string | number)[]
  message: string
}

export function createForm<T>(options?: CreateFormOptions<T>) {
  let _initialData = options?.initialData ?? Object.create(null)

  const data = writable<T>()
  const errors = writable<FieldError[]>([])
  const dirty = writable<Record<string, boolean>>({})

  if (_initialData instanceof Promise) {
    _initialData.then((awaitedInitialData) => {
      data.set(awaitedInitialData)
      _initialData = awaitedInitialData
    })
  }

  const form = (node: HTMLElement) => {
    const handleSubmit = (event: Event) => {
      const currentErrors = get(errors)
      if (currentErrors.length) {
        event.preventDefault()
        currentErrors[0].node.focus()
        return
      }
    }

    node.addEventListener('submit', handleSubmit)

    return {
      destroy() {
        node.removeEventListener('submit', handleSubmit)
      }
    }
  }

  /**
   * Svelte action to register a field.
   */
  const field = (node: HTMLElement, draftCallback: (t: T) => any) => {
    const inputNode = node as HTMLInputElement

    const handleChange = (event: Event) => {
      const e = event as InputEvent

      /**
       * Copy of current form data store.
       */
      const newData = get(data)

      /**
       * Create a draft proxy of the form data copy.
       */
      const draft = createDraftProxy(newData)

      /**
       * Pass the draft proxy to the callback;
       * the callback does a nested index of the original object and sets any undefined properites.
       *
       * Then invoke the function with the current value of the input;
       * this sets the value of the final accessed property, 
       * then returns an array of keys to that property.
       */
      const keys = draftCallback(draft)(e.currentTarget.value)

      /**
       * Use the array of keys to set the dirty flag for that property.
       */
      dirty.update(current => ({ ...current, [keys.join('.')]: true }))

      /**
       * If no schema is provided, just set the data.
       */
      if (!options?.schema) {
        return data.set(newData)
      }

      /**
       * If a schema is provided, validate the data.
       */
      const parseResult = options.schema.safeParse(newData)

      /**
       * If the data is valid, set the data.
       * Else filter the errors to only include errors for dirty fields.
       */
      if (parseResult.success) {
        return data.set(parseResult.data)
      } 
      else {
        const filteredErrors = parseResult.error.errors.filter((e) => {
          return Object.keys(get(dirty)).includes(e.path.join('.'))
        })
        errors.set(filteredErrors.map(e => ({ ...e, node })))
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
  const error = (node: HTMLElement, draftCallback: (t: T) => any) => {
    errors.subscribe(current => {
      /**
       * Get a copy of the errors store.
       */
      const newErrors: any = current

      /**
       * Create a draft proxy of the errors store.
       */
      const draft = createDraftProxy(newErrors)

      /**
       * Pass the draft proxy to the callback;
       * the callback does a nested index of the original object and sets any undefined properites.
       *
       * Then invoke the function with the current value of the input;
       * this sets the value of the final accessed property, 
       * then returns an array of keys to that property.
       */
      const keys = draftCallback(draft)()

      /**
       * Filter the errors to only include errors for the current field.
       */
      const matchingErrors = current.filter(error => error.path.join('.').includes(keys.join('.')))

      /**
       * Set the innerHTML of the error node to the error message.
       */
      node.innerHTML = matchingErrors.map(error => error.message).join('')
    })
  }

  const actions = { form, field, error }

  const stores = { dirty, data, errors }

  return { ...actions, ...stores }
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
        return keys
      }
      return prev[lastKey]
    },
  })
}

const get = (obj: any, path: string, defaultValue: unknown = undefined) => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

var object = { a: [{ b: { c: 3 } }] };
var result = get(object, 'a[0].b.c', 1);
