import { mapGetters } from 'vuex'
export const ebookMixin = {
  computed: {
    ...mapGetters(['fileName', 'menuVisible']) // menuVisible 顶部与底部菜单栏显示隐藏控制的值
  }
}
