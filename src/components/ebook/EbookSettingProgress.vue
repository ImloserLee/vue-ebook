<template>
  <transition name="slide-up">
    <div class="setting-wrapper" v-show="menuVisible && settingVisible === 2">
      <div class="setting-progress">
        <div class="read-time-wrapper">
          <span class="read-time-text">{{getReadTimeText()}}</span>
          <span class="icon-forward"></span>
        </div>
        <div class="progress-wrapper">
          <div class="progress-icon-wrapper" @click="prevSection">
            <span class="icon-back"></span>
          </div>
          <input
            class="progress"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="progress"
            :disabled="!bookAvailable"
            ref="progress"
            @input="onProgressInput($event.target.value)"
            @change="onProgressChange($event.target.value)"
          >
          <div class="progress-icon-wrapper"  @click="nextSection">
            <span class="icon-forward"></span>
          </div>
        </div>
        <div class="text-wrapper">
          <span class="progress-section-text">{{getSectionName}}</span>
          <span>({{bookAvailable ? progress + '%' : '加载中...'}})</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { ebookMixin } from '@/utils/mixin'
export default {
  mixins: [ebookMixin],
  methods: {
    onProgressInput(progress) {
      this.setProgress(progress).then(() => {
        this.updateProgressBg()
      })
    },
    onProgressChange(progress) {
      this.setProgress(progress).then(() => {
        this.displayProgress()
      })
    },
    // 展示对应进度的页面
    displayProgress() {
      // 通过电子书实例的api获取到cfi
      const cfi = this.currentBook.locations.cfiFromPercentage(this.progress / 100)
      // 这个方法是mixins中混入的
      this.display(cfi)
    },
    // 跟新进度条背景色
    updateProgressBg() {
      this.$refs.progress.style.backgroundSize = `${this.progress}% 100%`
    },
    // 跳转到前一章
    prevSection() {
      // 章节必须大于0, 电子书也需要解析完成才能进行章节的跳转
      if (this.section > 0 && this.bookAvailable) {
        // 将当前的章节减去1,存储到vuex中
        this.setSection(this.section - 1).then(() => {
          this.displaySection()
        })
      }
    },
    // 跳转到下一章
    nextSection() {
      // this.currentBook.spine表示阅读的章节总数
      if (this.section < this.currentBook.spine.length - 1 && this.bookAvailable) {
        this.setSection(this.section + 1).then(() => {
          this.displaySection()
        })
      }
    },
    // 展示对应章节的内容
    displaySection() {
      const sectionInfo = this.currentBook.section(this.section)
      if (sectionInfo && sectionInfo.href) {
        this.display(sectionInfo.href)
      }
    }
  },
  updated() {
    // 对进度条背景颜色进行初始化
    this.updateProgressBg()
  }
}
</script>

<style scoped lang="scss">
  @import "../../assets/styles/global";
  .setting-wrapper {
    position: absolute;
    left: 0;
    bottom: px2rem(48);
    z-index: 160;
    width: 100%;
    height: px2rem(90);
    background: #fff;
    box-shadow: 0 px2rem(-8) px2rem(8) rgba(0, 0, 0, .15);
    .setting-progress {
      position: relative;
      width: 100%;
      height: 100%;
      .read-time-wrapper {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: px2rem(40);
        font-size: px2rem(12);
        @include center;
      }
      .progress-wrapper {
        width: 100%;
        height: 100%;
        @include center;
        padding: 0 px2rem(15);
        box-sizing: border-box;
        .progress-icon-wrapper {
          font-size: px2rem(20);
        }
        .progress {
          width: 100%;
          -webkit-appearance: none;
          height: px2rem(2);
          margin: 0 px2rem(10);
          &:focus {
            outline: none;
          }
          &::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: px2rem(20);
            height: px2rem(20);
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 4px 4px 0 rgba(0, 0, 0, .15);
            border: px2rem(1) solid #ddd;
          }
        }
      }
      .text-wrapper {
        position: absolute;
        left: 0;
        bottom: px2rem(10);
        width: 100%;
        color: #333;
        font-size: px2rem(12);
        padding: 0 px2rem(15);
        box-sizing: border-box;
        @include center;
        .progress-section-text {
          @include ellipsis;
        }
      }
    }
  }
</style>
