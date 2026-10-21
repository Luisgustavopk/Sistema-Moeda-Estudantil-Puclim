import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { mockDesignReview } from './design-round1-fixture.ts'

// Node 24. Exporta respostas controladas de teste para inspeção visual, sem login real.
const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:5174'
const output = resolve('test-results/visual-snapshots')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
})
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  })
  await mockDesignReview(page)
  for (const [path, selector, name] of [
    ['/aluno/conquistas', '.achievement-card', 'conquistas'],
    ['/ranking', '.ranking-row', 'ranking'],
    ['/aluno/quiz', '.quiz-intro', 'quiz'],
    ['/perfis/student', '.public-profile-hero', 'perfil-publico'],
    ['/perfil/editar', '.editor-panel', 'editar-perfil'],
    ['/aluno/missoes', '.mission-tile', 'missoes'],
    ['/notificacoes', '.notice-item', 'notificacoes'],
    ['/aluno/recompensas', '.reward-row', 'recompensas'],
  ]) {
    await page.goto(`${base}${path}`)
    await page.locator(selector).first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    const html = await page.evaluate((origin) => {
      const root = document.documentElement.cloneNode(true)
      root.querySelectorAll('script').forEach((script) => script.remove())
      const base = document.createElement('base')
      base.href = origin
      root.querySelector('head').prepend(base)
      return '<!DOCTYPE html>' + root.outerHTML
    }, base)
    await writeFile(resolve(output, `${name}.html`), html)
  }
} finally {
  await browser.close()
}
console.log(
  `Prévias estáticas para inspeção em ${output}. Os testes funcionais usam a aplicação real.`,
)
