import type { z } from 'zod'
import { writable } from 'svelte/store'
import { deepSet } from '$lib/deepSet'
import { deepFind } from './deepFind'

type Paths<T, TPath extends string = ''> = {
  [k in keyof T]: 
    T[k] extends Record<string, unknown> 
      ? Paths<T[k], `${TPath}${Extract<k, string>}.`> 
      : T[k] extends Array<infer ArrayType> 
      ? ArrayType extends Record<string, unknown> 
        ? Paths<ArrayType, `${TPath}${Extract<k, string>}.${number}.`> 
        : `${TPath}${Extract<k, string>}.${number}` 
      : `${TPath}${Extract<k, string>}`
}[keyof T]

type InputEvent = Event & { currentTarget: EventTarget & HTMLInputElement }

type CreateFormOptions<T> = {
  initialData?: T,
  schema?: z.ZodSchema<T>
}

type FieldError = {
  message: string
}

type FormError<T> = {
  [k in keyof T]?: 
    FieldError &
    (T[k] extends Record<string, unknown> ? FormError<T[k]> : object) &
    (T[k] extends Array<unknown> ? FieldError[] : object)
}

export function createForm<T, TPath = Paths<T>>(options?: CreateFormOptions<T>) {
  const data = writable<T>(options?.initialData)
  const errors = writable<FormError<T>>({})

  const parse = <T>(input: unknown, schema: z.ZodSchema<T>) => {
    const result = schema.safeParse(input)
    return result
  }

  /**
   * Svelte action to register a field.
   */
  const field = (node: HTMLElement, name: Extract<TPath, string>) => {
    const handleChange = (event: Event) => {
      data.update(current => {

        const newData = deepSet(current, name, (event as InputEvent).currentTarget.value)
        if (options?.schema == null) return newData

        const result = parse<T>(newData, options.schema)
        if (result.success) {
          errors.update(e => {
            deepSet(e, name, undefined)
            return e
          })
          return result.data
        }

        errors.update(e => {
          result.error.errors
          .filter(schemaError => name.startsWith(schemaError.path.join('.')))
          .forEach((schemaError) => {
            deepSet(e, schemaError.path.join('.'), schemaError.message)
          })
          return e
        })

        return current
      })
    }

    node.addEventListener('change', handleChange)

    return {
      destroy() {
        node.removeEventListener('change', handleChange)
      }
    }
  }

  /**
   * Svelte action to register an error.
   */
  const error = (node: HTMLElement, name: Extract<TPath, string>) => {
    errors.subscribe(e => {
      const foundError = deepFind(e, name)
      if (foundError.penultimate == null) {
        node.innerHTML = ''
      } else {
        console.log(foundError.penultimate)
        node.innerHTML = foundError.penultimate[foundError.lastKey]
      }
    })
  }

  return { data, errors, field, error }
}

let y = {}

let x = new Proxy(() => {}, {
    get: (target, prop) => {
      return s(y, prop)
    },
})

const s = (prev, key) => {
  return new Proxy(() => {}, {
    get: (_target, prop) => {
      prev[key] ??= {}
      return s(prev[key], prop)
    },
    apply(_target, _thisArg, argArray) {
      prev[key] = argArray[0]
    },
  })
}
