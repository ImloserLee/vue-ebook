<template>
  <div class="ebook">
    <ebook-reader></ebook-reader>
  </div>
</template>

<script>
import EbookReader from '@/components/ebook/EbookReader.vue'
export default {
  components: {
    EbookReader
  }
}
</script>

<style lang="scss" scoped>
  .ebook {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
