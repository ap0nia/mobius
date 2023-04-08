<script lang="ts">
  import { z } from 'zod'
  import { createForm } from '$lib/createForm'

  type MyForm = {
    username: string
    password: string
    user: {
      name: {
        first: string
        last: string
      }
    }
  }

  const { field, custom, error } = createForm<MyForm>({
    schema: z.object({
      username: z.string(),
      password: z.string(),
      user: z.object({
        name: z.object({
          first: z.string(),
          last: z.string(),
        }),
      }),
    }),
  })

  const { onChange, value } = custom((f) => f.user.name.first)

  const handle = () => {
    onChange('hello')
  }
</script>

<p>Value</p>
<pre>{JSON.stringify($value, null, 2)}</pre>
<div>
  <label for="">
    User Name First
    <input type="tel" use:field={(f) => f.user.name.first} />
  </label>
</div>

<div>
  <label for="">
    User Name Last
    <input type="text" use:field={(f) => f.user.name.last} />
  </label>
</div>

<div>
  <label for="">
    User Name
    <input type="text" use:field={(f) => f.username} />
  </label>
</div>

<div>
  <label for="">
    Password
    <input type="text" use:field={(f) => f.password} />
  </label>
</div>

<p use:error={d => d.user.name.first}></p>

<button on:click={handle}>Do something</button>
