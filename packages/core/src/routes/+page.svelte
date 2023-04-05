<script lang="ts">
  import { z } from 'zod'
  import { scope } from "arktype"
  import { createForm } from '$lib'

  const formData = scope({ username: { name: 'string' }, passwords: 'username[]' })

  const { data, errors, error, field } = createForm<typeof formData.infer>({
    schema: z.object({
      username: z.object({
        name: z.string()
      }),
      passwords: z.array(
        z.object({
          name: z.string().length(4)
        })
      )
    })
  })

  $: console.log($data, $errors)
</script>

<form action="">
  p0
  <input type="text" use:field={'passwords.0.name'}>

  p1
  <input type="text" use:field={'passwords.1.name'}>

  e0
  <p use:error={'passwords.0.name'}></p>
</form>
