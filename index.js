import test from 'ava'
import puppeteer from 'puppeteer'
import fs from 'fs'

test('google', async t => {
  if (!fs.existsSync('./dumps')) fs.mkdirSync('./dumps')

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const metrics = await page.tracing.start({ path: './dumps/trace.json' })
  await page.goto('https://google.com')
  await page.tracing.stop()
  browser.close()

  t.pass()
})
