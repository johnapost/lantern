import test from 'ava'
import puppeteer from 'puppeteer'
import fs from 'fs'

const getFirstMeaningfulPaint = async (page, client) => {
  await page.waitFor(200)
  const { metrics } = await client.send('Performance.getMetrics')

  // Time that FMP occurs
  const firstMeaningfulPaint = metrics.filter(({ name }) => name === 'FirstMeaningfulPaint')[0].value

  // Recurse
  if (firstMeaningfulPaint === 0) {
    return await getFirstMeaningfulPaint(page, client)
  }

  console.log(metrics)

  // Time that we actually navigate to the page
  const navigationStart = metrics.filter(({ name }) => name === 'NavigationStart')[0].value

  // Convert seconds to milliseconds
  return (firstMeaningfulPaint - navigationStart) * 1000
}

test('google', async t => {
  // Make dumps dir
  if (!fs.existsSync('./dumps')) fs.mkdirSync('./dumps')

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const client = await page.target().createCDPSession()
  await client.send('Performance.enable')

  // Enable JS and CSS coverage
  await Promise.all([
    page.coverage.startJSCoverage(),
    page.coverage.startCSSCoverage()
  ])

  await page.tracing.start({ path: './dumps/trace.json' })
  await page.goto('https://thezebra.com')

  const firstMeaningfulPaint = await getFirstMeaningfulPaint(page, client)

  const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
  ])

  let jsTotalBytes = 0;
  let jsUsedBytes = 0;
  let cssTotalBytes = 0;
  let cssUsedBytes = 0;

  for (const entry of jsCoverage) {
    jsTotalBytes += entry.text.length
    for (const range of entry.ranges) {
      jsUsedBytes += range.end - range.start - 1
    }
  }

  for (const entry of cssCoverage) {
    cssTotalBytes += entry.text.length
    for (const range of entry.ranges) {
      cssUsedBytes += range.end - range.start - 1
    }
  }

  await page.tracing.stop()
  browser.close()

  console.log('\n')
  console.log(`Milliseconds until First Meaningful Paint: ${firstMeaningfulPaint}`)
  console.log(`Unused JS code: ${100 - (jsUsedBytes / jsTotalBytes * 100)}%`)
  console.log(`Unused CSS code: ${100 - (cssUsedBytes / cssTotalBytes * 100)}%`)

  t.pass()
})
