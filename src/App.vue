<template>
  <div id="app" style="padding: 20px;">
    <div style="padding-left: 80px;">
      SYMBOL:
      <select name="symbol" id="symbol" v-model="symbolSelected">
        <option :value="item.symbol" v-for="item in active_symbols" :key="item.symbol">{{item.symbol}}</option>
      </select>
    </div>
    <div id="chart" style="width: 1000px;height: 500px;"></div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import * as echarts from 'echarts';
export default {
  name: 'App',
  components: {
  },
  data() {
    return {
      ws: new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'),
      token: 'ynIKawRqC7TncpZ',
      active_symbols: [],
      symbolSelected: 'R_50',
      historySubscriptionId: null,
      candlesSubscriptionId: null,
      ticks: [],
      candles: [],
      chart: null,
      tickRequestDefaultCount: 5000,
      isCandlesLoading: false,
      isTicksLoading: false,
      dataZoomStart: null,
      dataZoomEnd: null,
      zoomLevel: 40
    }
  },
  computed: {
    ...mapState({
    }),
    chartType() {
      return this.zoomLevel >= 90 ? 'line' : 'candlestick'
      return 'line'
    },
    candlesRequestDefaultCount() {
      return Math.floor(this.tickRequestDefaultCount / 30)
    },
    kLineXAxis() {
      return this.candles.map(candle => {
        return candle.xAxisTime
      })
    },
    kLineXAxisMin() {
      return this.kLineXAxis[0]
    },
    kLineXAxisMax() {
      return this.kLineXAxis[this.kLineXAxis.length - 1]
    },
    isLoading() {
      return this.isCandlesLoading || this.isTicksLoading
    }
  },
  watch: {
    isLoading(_isLoading) {
      if (_isLoading) {
        this.chart && this.chart.showLoading()
        this.chart.setOption({
          dataZoom: [{
            disabled: true
          }]
        })
      } else {
        this.chart && this.chart.hideLoading()
        this.chart.setOption({
          dataZoom: [{
            disabled: false
          }]
        })
      }
    },
    symbolSelected(newSymbol, oldSymbol) {
      this.isCandlesLoading = true
      this.isTicksLoading = true
      // 先把原来的连接取消
      this.ws.send(JSON.stringify({
        "forget": this.historySubscriptionId
      }))
      this.ws.send(JSON.stringify({
        "forget": this.candlesSubscriptionId
      }))
      // 获取新品种的数据
      // 订阅ticks
      this.ws.send(JSON.stringify({
        "ticks_history": newSymbol,
        "adjust_start_time": 1,
        "end": "latest",
        "count": this.tickRequestDefaultCount,
        "style": "ticks",
        "subscribe": 1
      }))
      // 订阅k线
      this.ws.send(JSON.stringify({
        "ticks_history": newSymbol,
        "adjust_start_time": 1,
        "end": "latest",
        "count": this.candlesRequestDefaultCount,
        "style": "candles",
        "subscribe": 1
      }))
    },
    kLineXAxis(newValue, oldValue) {
      // 1 最开始的时候不可刷新、 2 如果不是加载历史数据，也不更新
      if (this.dataZoomStart !== null && (newValue.length - oldValue.length) > 20) {
        // 当坐标轴发生改变的时候，重新设置dataZoom位置，使得dataZoom仍能停留在原浏览位置
        let oldStartIndex = Math.floor(oldValue.length * this.dataZoomStart / 100)
        let oldStartValue = oldValue[oldStartIndex]
        let oldEndIndex = Math.floor((oldValue.length - 1) * this.dataZoomEnd / 100)
        let oldEndValue = oldValue[oldEndIndex]
        this.chart.dispatchAction({
          type: 'dataZoom',
          dataZoomIndex: 0,
          // 开始位置的数值
          startValue: `${oldStartValue}`,
          // 结束位置的数值
          endValue: `${oldEndValue}`
        })
      }
    }
  },
  methods: {
    initChart() {
      this.chart || (this.chart = echarts.init(document.getElementById('chart')))
      // 图表的基本设置
      this.chart.setOption({
        animation: false,
        title: {
          left: 'center',
          text: 'Feed Browser'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          position: function (pos, params, el, elRect, size) {
            var obj = { top: 10 };
            obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
            return obj;
          }
        },
        axisPointer: {
          link: [{ xAxisIndex: 'all' }],
          label: {
            formatter: function (obj) {
              if (obj.axisDimension === 'x') {
                return echarts.format.formatTime('hh:mm:ss', +obj.value);
              } else {
                return obj.value.toFixed(4)
              }
            }
          }
        }
      })
      // 监听 dataZoom改变事件
      this.chart.on('dataZoom', (evt) => {
        if (evt.batch) {
          // 过滤一些脏事件
          if (!isNaN(evt.batch[0].start)) {
            this.dataZoomStart = evt.batch[0].start
            this.dataZoomEnd = evt.batch[0].end
            if (evt.batch[0].start === 0) {
              this.getMoreHistoryData()
            } else {
              let oldStartIndex = Math.floor(this.kLineXAxis.length * this.dataZoomStart / 100)
              let oldStartValue = this.kLineXAxis[oldStartIndex]
              let oldEndIndex = Math.floor((this.kLineXAxis.length - 1) * this.dataZoomEnd / 100)
              let oldEndValue = this.kLineXAxis[oldEndIndex]
              // 1毫秒转化为秒 2秒转化为分钟 3 除初始的数据量 4 转化为百分比 5 拿总量（100）减去
              this.zoomLevel = 100 - (oldEndValue - oldStartValue) / 1000 / 60 / this.candlesRequestDefaultCount * 100
              this.updateChart()
            }
          }
        }
      })
    },
    initWebSocket() {
      return new Promise(resolve => {
        this.ws.onopen = evt => {
          this.isCandlesLoading = true
          this.isTicksLoading = true
          this.ws.send(JSON.stringify({ "authorize": this.token }))
          // 获取品种
          this.ws.send(JSON.stringify({
            "active_symbols": "brief",
            "product_type": "basic"
          }))
          // 订阅ticks
          this.ws.send(JSON.stringify({
            "ticks_history": this.symbolSelected,
            "adjust_start_time": 1,
            "end": "latest",
            "count": this.tickRequestDefaultCount,
            "style": "ticks",
            "subscribe": 1
          }))
          // 订阅k线
          this.ws.send(JSON.stringify({
            "ticks_history": this.symbolSelected,
            "adjust_start_time": 1,
            "end": "latest",
            "count": this.candlesRequestDefaultCount,
            "style": "candles",
            "subscribe": 1
          }))
        }
        this.ws.onmessage = msg => {
          var data = JSON.parse(msg.data);
          if (data.error) {
            this.$toast(data.error.message)
            this.isCandlesLoading = false
            this.isTicksLoading = false
          } else {
            switch (data.msg_type) {
              case 'history':
                let historyDatas = data.history.prices.map((item, index) => {
                  return {
                    epoch: data.history.times[index],
                    quote: item
                  }
                })
                if (data.echo_req.end === 'latest') {
                  // 第一次请求历史数据
                  this.ticks = historyDatas
                  this.historySubscriptionId = data.subscription.id
                  this.updateChart()
                } else {
                  // 请求更多历史数据
                  this.ticks = historyDatas.concat(this.ticks)
                  this.updateChart()
                }
                this.isTicksLoading = false
                resolve()
                break
              case 'tick':
                this.ticks.push(data.tick)
                this.updateChart()
                break
              case 'candles':
                let candlesData = data.candles.map(candle => {
                  return {
                    ...candle,
                    xAxisTime: candle.epoch * 1000
                  }
                })
                if (data.echo_req.end === 'latest') {
                  // 第一次请求历史数据
                  this.candles = candlesData
                  this.candlesSubscriptionId = data.subscription.id
                  this.updateChart()
                } else {
                  // 请求更多历史数据
                  this.candles = candlesData.concat(this.candles)
                  this.updateChart()
                }
                this.isCandlesLoading = false
                resolve()
                break
              case 'ohlc':
                let open_time = this.candles[this.candles.length - 1].open_time
                let newOhlcData = {
                  ...data.ohlc,
                  xAxisTime: data.ohlc.open_time * 1000
                }
                if (data.ohlc.open_time === open_time) {
                  this.candles[this.candles.length - 1] = newOhlcData
                } else {
                  this.candles.push(newOhlcData)
                }
                this.updateChart()
                break
              case 'active_symbols':
                this.active_symbols = data.active_symbols
                break
              default:
                break
            }
          }
        }
      })
    },
    updateChartDataZoom() {
      this.chart.setOption({
        dataZoom: [{
          type: 'inside',
          xAxisIndex: [0],
          startValue: `${Math.floor(40 / 100 * this.kLineXAxisMax + (100 - 40) / 100 * this.kLineXAxisMin)}`,
          endValue: `${this.kLineXAxisMax}`,
          filterMode: 'filter',
          moveOnMouseWheel: false
        }]
      })
    },
    updateChart() {
      // zoomLevel -> chartType -> 决定更新的图表类型
      if (this.chartType === 'line') {
        this.chart.setOption({
          xAxis: [{
            type: 'time',
            boundaryGap: false,
            axisLine: { lineStyle: { color: '#777' } },
            axisLabel: {
              formatter: function (value) {
                return echarts.format.formatTime('hh:mm:ss', value);
              }
            },
            axisPointer: {
              show: true
            }
          }],
          yAxis: [{
            min: 'dataMin',
            max: 'dataMax',
            minInterval: 0.01,
            scale: true,
            splitNumber: 2,
            axisLine: { lineStyle: { color: '#777' } },
            splitLine: { show: true },
            axisTick: { show: false },
            axisLabel: {
              inside: false,
              formatter: '{value}\n'
            }
          }],
          series: [{
            type: 'line',
            symbol: 'none',
            smooth: 0,
            sampling: 'lttb',
            data: this.getLineData(),
            itemStyle: {
              color: '#ef232a',
              color0: '#14b143',
              borderColor: '#ef232a',
              borderColor0: '#14b143'
            },
            emphasis: {
              itemStyle: {
                color: 'black',
                color0: '#444',
                borderColor: 'black',
                borderColor0: '#444'
              }
            }
          }],
          dataZoom: [{
            type: 'inside',
            xAxisIndex: [0],
            filterMode: 'filter',
            moveOnMouseWheel: false,
            minValueSpan: 60 * 1000,
            maxValueSpan: null
          }]
        })
      } else {
        this.chart.setOption({
          xAxis: [{
            type: 'category',
            data: this.kLineXAxis,
            boundaryGap: false,
            axisLine: { lineStyle: { color: '#777' } },
            axisLabel: {
              formatter: function (value) {
                return echarts.format.formatTime('hh:mm:ss', +value);
              }
            },
            axisPointer: {
              show: true
            }
          }],
          yAxis: [{
            min: 'dataMin',
            max: 'dataMax',
            minInterval: 0.01,
            scale: true,
            splitNumber: 2,
            axisLine: { lineStyle: { color: '#777' } },
            splitLine: { show: true },
            axisTick: { show: false },
            axisLabel: {
              inside: false,
              formatter: '{value}\n'
            }
          }],
          series: [{
            type: 'candlestick',
            data: this.getKLineData(),
          }],
          dataZoom: [{
            type: 'inside',
            xAxisIndex: [0],
            filterMode: 'filter',
            moveOnMouseWheel: false,
            minValueSpan: 0,
            maxValueSpan: null
          }]
        })
      }
    },
    getMoreHistoryData() {
      if (this.isLoading === false) {
        this.isCandlesLoading = true
        this.isTicksLoading = true
        // 得到candles的第一条数据的时间
        let end = this.candles[0].epoch
        // 订阅ticks
        this.ws.send(JSON.stringify({
          "ticks_history": this.symbolSelected,
          "adjust_start_time": 1,
          "end": end,
          "count": this.tickRequestDefaultCount,
          "style": "ticks",
        }))
        // 订阅k线
        this.ws.send(JSON.stringify({
          "ticks_history": this.symbolSelected,
          "adjust_start_time": 1,
          "end": end,
          "count": this.candlesRequestDefaultCount,
          "style": "candles",
        }))
      }
    },
    getLineData() {
      return this.ticks.map(tick => {
        return [tick.epoch * 1000, +tick.quote]
      })
    },
    getKLineData() {
      return this.candles.map(candle => {
        return [candle.open, candle.close, candle.low, candle.high]
      })
    },
  },
  created() {
    
  },
  mounted() {
    this.initChart()
    this.initWebSocket().then(() => {
      this.updateChartDataZoom()
    })
  },
  
}
</script>

<style>
#app {
  
}
</style>
