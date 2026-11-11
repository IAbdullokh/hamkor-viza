/**
 * ECharts look that matches Liquid Glass: colours come from CSS variables (so theme + accent switches apply),
 * hairline dashed grid, no axis lines, rounded bars, glass tooltip (.echarts-glass in styles/data.css).
 */
export interface ChartColors {
  series: string[]
  ink: string
  ink2: string
  ink3: string
  grid: string
  axis: string
  primary: string
  /** --good: a won / answered series (absent = the default green) */
  good?: string
  surface: string
  dark: boolean
}

export function readChartColors(): ChartColors {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  return {
    series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--chart-${i}`)),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    grid: v('--chart-grid'),
    axis: v('--chart-axis'),
    primary: v('--primary'),
    good: v('--good'),
    surface: v('--surface-solid'),
    dark: document.documentElement.dataset.theme === 'dark',
  }
}

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif`

export function buildTheme(c: ChartColors): Record<string, unknown> {
  const axisCommon = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: c.ink3, fontSize: 11, fontFamily: FONT, hideOverlap: true },
    splitLine: { lineStyle: { color: c.grid, type: [3, 3] } },
    nameTextStyle: { color: c.ink3, fontSize: 11 },
  }
  return {
    color: c.series,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: FONT, color: c.ink2 },
    title: { textStyle: { color: c.ink, fontWeight: 600, fontSize: 14 } },
    legend: {
      textStyle: { color: c.ink2, fontSize: 12 },
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      inactiveColor: c.grid,
      pageIconColor: c.ink2,
      pageTextStyle: { color: c.ink3 },
    },
    tooltip: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      className: 'echarts-glass',
      textStyle: { color: c.ink, fontSize: 12, fontFamily: FONT },
      axisPointer: {
        lineStyle: { color: c.axis, type: [3, 3] },
        crossStyle: { color: c.axis },
        shadowStyle: { color: c.dark ? 'rgba(255,255,255,0.04)' : 'rgba(120,120,128,0.08)' },
      },
    },
    categoryAxis: { ...axisCommon, splitLine: { show: false } },
    valueAxis: { ...axisCommon, splitNumber: 4 },
    timeAxis: { ...axisCommon, splitLine: { show: false } },
    line: { symbol: 'circle', symbolSize: 6, showSymbol: false, smooth: 0.35, lineStyle: { width: 2.25 } },
    bar: { barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 2, 2] } },
    pie: { itemStyle: { borderColor: c.dark ? '#2c2c2e' : '#ffffff', borderWidth: 2, borderRadius: 6 } },
    funnel: { itemStyle: { borderWidth: 0 } },
    gauge: { axisLine: { lineStyle: { color: [[1, c.grid]] } } },
    dataZoom: { borderColor: 'transparent', backgroundColor: c.grid, fillerColor: c.grid, handleStyle: { color: c.primary } },
    visualMap: { textStyle: { color: c.ink3 } },
  }
}
