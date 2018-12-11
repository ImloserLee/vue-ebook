<template>
  <div class="ebook-reader">
    <div id="read"></div>
    <div class="ebook-reader-mask"
      @click="onMaskClick"
      @touchmove="move"
      @touchend="moveEnd"
      @mousedown.left="onMouseEnter"
      @mousemove.left="onMouseMove"
      @mouseup.left="onMouseEnd">
    </div>
  </div>
</template>

<script>
import { ebookMixin } from '@/utils/mixin'
import { flatten } from '@/utils/book'
import {
  getFontFamily,
  saveFontFamily,
  getFontSize,
  saveFontSize,
  getTheme,
  saveTheme,
  getLocation
} from '@/utils/localStorage'
import Epub from 'epubjs'
global.ePub = Epub
export default {
  mixins: [ebookMixin],
  mounted() {
    this.setFileName(this.$route.params.fileName.split('|').join('/')).then(() => {
      this.initEpub()
    })
  },
  methods: {
    initEpub() {
      let url = process.env.VUE_APP_RES_URL + '/epub/' + this.fileName + '.epub'
      this.book = new Epub(url)
      this.setCurrentBook(this.book) // 将电子书变量存储到vuex
      this.initRendition()
      // this.initGesture()
      this.parseBook()
      this.book.ready.then(() => {
        // 一个粗略的分页 默认为750乘以屏幕宽度与375这个基准值的比值,在乘以字体与16这个基准值的比值
        return this.book.locations.generate(750 * (window.innerWidth / 375) * (getFontSize(this.fileName) / 16))
      }).then((locations) => {
        // 分页完成之后的操作
        this.navigation.forEach(nav => {
          nav.pageList = []
        })
        locations.forEach(item => {
          const loc = item.match(/\[(.*)\]!/)[1]
          let currentPage = 1
          this.navigation.forEach((nav, index) => {
            if (nav.href) {
              const href = nav.href.match(/^(.*)\.html$/)[1]
              if (href === loc) {
                nav.pageList.push(item)
              }
            }
            if (index === 0) {
              nav.page = 1
            } else {
              nav.page = currentPage
            }
            currentPage += nav.pageList.length + 1
          })
        })
        this.setPagelist(locations)
        this.setBookAvailable(true)
        this.refreshLocation()
      })
    },
    initFontSize() {
      // 根据不同电子书的名称去获取存储在localstorage中对应的字号
      let fontSize = getFontSize(this.fileName)
      if (!fontSize) {
        // 如果localstorage中没有存储字号, 则设置默认字号(vuex中定义的)
        saveFontSize(this.fileName, this.defaultFontSize)
      } else {
        // 如果能获取到字号, 将电子书的字号设置为该值
        this.rendition.themes.font(fontSize)
        this.setDefaultFontSize(fontSize)
      }
    },
    initFontFamily() {
      // 根据不同电子书的名称去获取存储在localstorage中对应的字体
      let font = getFontFamily(this.fileName)
      if (!font) {
        // 如果localstorage中没有存储字体, 则设置默认字体(vuex中定义的)
        saveFontFamily(this.fileName, this.defaultFontFamily)
      } else {
        // 如果能获取到字体, 将电子书的字体设置为该值,并将字体选择的弹窗中对应的字体文本设置为该值
        this.rendition.themes.font(font)
        this.setDefaultFontFamily(font)
      }
    },
    initTheme() {
      let defaultTheme = getTheme(this.fileName)
      if (!defaultTheme) {
        // 如果localstorage没有存储主题,从自己定义的themeList中去获取
        defaultTheme = this.themeList[0].name
        // 存储到localstorage
        saveTheme(this.fileName, this.defaultTheme)
      }
      // 将获取到的主题设置为默认主题
      this.setDefaultTheme(defaultTheme)
      // 这个themeList是mixin中混入的,所以可以获取到
      this.themeList.forEach(theme => {
        this.rendition.themes.register(theme.name, theme.style)
      })
      this.rendition.themes.select(defaultTheme)
    },
    initRendition() {
      this.rendition = this.book.renderTo('read', {
        width: innerWidth,
        height: innerHeight,
        method: 'default'
      })
      // 初始化的时候去localstorage获取存储的之前书籍的进度
      const location = getLocation(this.fileName)
      this.display(location, () => {
        this.initFontSize()
        this.initFontFamily()
        this.initTheme()
        this.initGlobalStyle()
      })
      this.rendition.hooks.content.register(contents => {
        Promise.all([
          contents.addStylesheet(`${process.env.VUE_APP_RES_URL}/fonts/daysOne.css`),
          contents.addStylesheet(`${process.env.VUE_APP_RES_URL}/fonts/cabin.css`),
          contents.addStylesheet(`${process.env.VUE_APP_RES_URL}/fonts/montserrat.css`),
          contents.addStylesheet(`${process.env.VUE_APP_RES_URL}/fonts/tangerine.css`)
        ]).then(() => {})
      })
    },
    initGesture() {
      this.rendition.on('touchstart', event => {
        this.touchStartX = event.changedTouches[0].clientX
        this.touchStartTime = event.timeStamp
      })
      this.rendition.on('touchend', event => {
        const offsetX = event.changedTouches[0].clientX - this.touchStartX
        const time = event.timeStamp - this.touchStartTime
        // 滑过时间time<500ms,画过的距离>40,往前翻页
        // 滑过时间time<500ms,画过的距离<-40,往后翻页
        if (time < 500 && offsetX > 40) {
          this.prevPage()
        } else if (time < 500 && offsetX < -40) {
          this.nextPage()
        } else {
          this.toggleTitleAndMenu()
        }
        event.preventDefault()
        event.stopPropagation()
      })
    },
    // 解析电子书封面
    parseBook() {
      this.book.loaded.cover.then(cover => {
        this.book.archive.createUrl(cover).then(url => {
          // 获取到封面的url 存入vuex
          this.setCover(url)
        })
      })
      this.book.loaded.metadata.then(metadata => {
        this.setMetadata(metadata)
      })
      this.book.loaded.navigation.then(nav => {
        // 先将获取到导航格式化,转换成一维素组
        let navItem = flatten(nav.toc)
        // 定义数组中每一项的level, 如果没有parent, 当前项为第一级,如果有,找到上一级的level, 逐级调用find
        function find(item, level = 0) {
          if (!item.parent) {
            return level
          } else {
            return find(navItem.filter(parentItem => parentItem.id === item.parent)[0], ++level)
          }
        }
        navItem.forEach(item => {
          item.level = find(item)
        })
        this.setNavigation(navItem)
      })
    },
    prevPage() {
      if (this.rendition) {
        this.rendition.prev().then(() => {
          this.refreshLocation()
        })
        this.hideTitleAndMenu()
      }
    },
    nextPage() {
      if (this.rendition) {
        this.rendition.next().then(() => {
          this.refreshLocation()
        })
        this.hideTitleAndMenu()
      }
    },
    toggleTitleAndMenu() {
      // 如果底部菜单在切换的时候, 默认先把字号设置的一栏隐藏掉
      if (this.menuVisible) {
        this.setSettingVisible(-1)
        this.setFontFamilyVisible(false)
      }
      this.setMenuVisible(!this.menuVisible)
    },
    onMaskClick(e) {
      if (this.mouseState && (this.mouseState === 2 || this.mouseState === 3)) {
        return
      }
      const offsetX = e.offsetX
      const width = window.innerWidth
      if (offsetX > 0 && offsetX < width * 0.3) {
        this.prevPage()
      } else if (offsetX > 0 && offsetX > width * 0.7) {
        this.nextPage()
      } else {
        this.toggleTitleAndMenu()
      }
    },
    move(e) {
      let offsetY = 0
      if (this.firstOffsetY) {
        offsetY = e.changedTouches[0].clientY - this.firstOffsetY
        this.setOffsetY(offsetY)
      } else {
        this.firstOffsetY = e.changedTouches[0].clientY
      }
      e.preventDefault()
      e.stopPropagation()
    },
    moveEnd(e) {
      this.firstOffsetY = null
      this.setOffsetY(0)
    },
    // 1 - 鼠标进入
    // 2 -鼠标进入后的移动
    // 3 - 鼠标从移动状态松手
    // 4 - 鼠标还原
    onMouseEnd(e) {
      if (this.mouseState === 2) {
        this.firstOffsetY = null
        this.setOffsetY(0)
        this.mouseState = 3
      } else {
        this.mouseState = 4
      }
      const time = e.timeStamp - this.mouseStartTime
      if (time < 100) {
        this.mouseState = 4
      }
      e.preventDefault()
      e.stopPropagation()
    },
    onMouseMove(e) {
      if (this.mouseState === 1) {
        this.mouseState = 2
      } else if (this.mouseState === 2) {
        let offsetY = 0
        if (this.firstOffsetY) {
          offsetY = e.clientY - this.firstOffsetY
          this.setOffsetY(offsetY)
        } else {
          this.firstOffsetY = e.clientY
        }
      }
      e.preventDefault()
      e.stopPropagation()
    },
    onMouseEnter(e) {
      this.mouseState = 1
      this.mouseStartTime = e.timeStamp
      e.preventDefault()
      e.stopPropagation()
    }
  }
}
</script>

<style lang="scss" scoped>
  .ebook-reader {
    width: 100%;
    height: 100%;
    overflow: hidden;
    .ebook-reader-mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 150;
      background: transparent;
    }
  }
</style>
