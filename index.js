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

  await page.tracing.start({ path: './dumps/trace.json' })
  await page.goto('https://thezebra.com')

  const firstMeaningfulPaint = await getFirstMeaningfulPaint(page, client)

  await page.tracing.stop()
  browser.close()

  console.log('\nMilliseconds until First Meaningful Paint', firstMeaningfulPaint)

  t.pass()
})
