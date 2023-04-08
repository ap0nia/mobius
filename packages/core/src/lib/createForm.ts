import { get, writable, derived } from 'svelte/store'
import type { z } from 'zod'
import { keysProxy } from './proxy'
import _update from './utils/_update'
import _get from './utils/_get'

export type InputChangeEvent = Event & { 
  currentTarget: EventTarget & HTMLInputElement
}

export type FieldError = {
  message: string
  node?: HTMLInputElement
}

export type CreateFormOptions<T> = {
  initialData?: T | Promise<T>
  schema?: z.ZodSchema<T>
  onSubmit?: (data: T) => Promise<void> | void
}

const textInputs = ['text', 'email', 'password', 'number', 'tel', 'url']

export function createForm<T>(options: CreateFormOptions<T> = {}) {
  let _initialData = options.initialData

  const rawData = writable<T>(_initialData ?? Object.create(null), (set) => {
    if (options.initialData instanceof Promise) {
      options.initialData.then((data) => {
        _initialData = data
        set(data)
      })
    } 
  })

  const rawErrors = writable<Record<string, FieldError>>({})

  const data = derived(rawData, ($data) => {
    const { value, errors } = validate($data)
    rawErrors.set(errors)
    nodes.forEach((node, key) => {
      node.value = _get(value, key) ?? '' as any
    })
    return value
  })

  const errors = derived(rawErrors, ($errors) => {
    const dirtyKeys = Object.keys(get(dirty))

    const fieldErrorMap = Object.entries($errors)
      .filter(([k]) => dirtyKeys.some((dirtyKey) => dirtyKey.startsWith(k)))
      .reduce((acc, [k, v]) => {
        acc[k] = v
        return acc
      }, {} as Record<string, FieldError>)

    return fieldErrorMap
  })

  const dirty = writable<Record<string, boolean>>({})

  const nodes = new Map<string, HTMLInputElement>()

  const addNode = (key: string, node: HTMLInputElement) => {
    nodes.set(key, node)
  }

  const update = (key: string, value: any) => {
    dirty.update((currentDirty) => {
      currentDirty[key] = true
      return currentDirty
    })
    rawData.update((currentData) => _update(currentData, key, value))
  }

  const validate = (value: T) => {
    if (options.schema == null) {
      return { value, errors: {} }
    }

    const result = options.schema.safeParse(value)

    if (result.success) {
      return { value: result.data, errors: {} }
    }

    const dirtyKeys = Object.keys(get(dirty))

    const errors = result.error.errors
      .map((error) => ({ ...error, key: error.path.join('.') }))
      .filter((error) => dirtyKeys.some((dirtyKey) => dirtyKey.startsWith(error.key)))
      .reduce((acc, error) => {
        acc[error.key] = {
          message: error.message,
          node: nodes.get(error.key),
        }
        return acc
      }, {} as Record<string, FieldError>)

    rawErrors.set(errors)

    return { value, errors }
  }

  const custom = <U, V = undefined>(callback: (t: T) => U, defaultValue?: V) => {
    const keysGetter = callback(keysProxy(Object.create(null))) as () => string[]
    const keys = keysGetter()
    const key = keys.join('.')

    const value = derived<any, U | V>(rawData, ($data) => {
      return (_get($data, key) ?? defaultValue) as U | V
    })

    const onChange = (newValue: U) => {
      update(key, newValue)
    }

    const addElement = (node: HTMLInputElement) => {
      addNode(key, node)
    }

    return { onChange, addElement, value }
  }

  const field = <U>(node: HTMLInputElement, callback: (t: T) => U) => {
    const keysGetter = callback(keysProxy(Object.create(null))) as () => string[]
    const keys = keysGetter()
    const key = keys.join('.')

    addNode(key, node)

    const onChange = (event: Event) => {
      update(key, (event as InputChangeEvent).currentTarget.value)
    }

    if (textInputs.includes(node.type)) {
      node.addEventListener('input', onChange)
    } else {
      node.addEventListener('change', onChange)
    }

    return {
      destroy() {
        node.removeEventListener('input', onChange)
        node.removeEventListener('change', onChange)
      },
    }
  }

  const form = (node: HTMLInputElement) => {
    const onSubmit = (event: Event) => {
      if (options.onSubmit == null) return

      event.preventDefault()

      const currentErrors = get(errors)

      const firstError = Object.entries(currentErrors)[0]

      if (firstError != null) {
        firstError[1].node?.focus()
        return
      }

      options.onSubmit(get(data))
    }

    node.addEventListener('submit', onSubmit)

    return {
      destroy() {
        node.removeEventListener('submit', onSubmit)
      },
    }
  }

  const error = <U>(node: HTMLInputElement, callback: (t: T) => U) => {
    const keysGetter = callback(keysProxy(Object.create(null))) as () => string[]
    const keys = keysGetter()
    const key = keys.join('.')

    errors.subscribe((errors) => {
      node.innerText = errors[key]?.message ?? ''
    })
  }

  const resetField = <U>(callback: (t: T) => U) => {
    const keysGetter = callback(keysProxy(Object.create(null))) as () => string[]
    const keys = keysGetter()
    const key = keys.join('.')

    dirty.update((currentDirty) => {
      delete currentDirty[key]
      return currentDirty
    })

    rawErrors.update((currentErrors) => {
      delete currentErrors[key]
      return currentErrors
    })

    rawData.update((currentData) => _update(currentData, key, _get(_initialData, key) as any))
  }

  const reset = () => {
    rawData.update(() => _initialData as any)
    rawErrors.update(() => ({}))
    dirty.update(() => ({}))
  }

  const stores = { data, rawData, dirty, errors, rawErrors }

  const utilities = { custom, resetField, reset }

  const actions = { field, form, error }

  return { ...stores, ...utilities, ...actions }
}
