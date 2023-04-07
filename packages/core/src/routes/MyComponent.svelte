<script lang="ts">
  export let value: number
  export let increment: () => void

  $: console.log(value)
</script>

<div>
  <h1>Value</h1>
  <p>{value}</p>
  
  <button on:click={increment}>Increment</button>
</div>
