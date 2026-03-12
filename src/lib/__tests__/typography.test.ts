import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '../../..')
const globalsCss = readFileSync(join(root, 'src/app/globals.css'), 'utf8')
const layoutTsx = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8')

describe('Typography configuration', () => {
  test('body font-size is 17px', () => {
    // Either 17px directly or 1.0625rem (= 17px)
    expect(globalsCss).toMatch(/font-size:\s*(17px|1\.0625rem)/)
  })

  test('body font-weight is set to 450', () => {
    expect(globalsCss).toMatch(/font-weight:\s*450/)
  })

  test('body line-height is set', () => {
    expect(globalsCss).toMatch(/line-height:\s*1\.65/)
  })

  test('light mode --muted-foreground lightness is below 0.45', () => {
    // Extract the oklch value for --muted-foreground in :root (light mode)
    // It should be oklch(L ...) where L < 0.45
    const rootSection = globalsCss.match(/:root\s*\{([^}]+)\}/s)?.[1] ?? ''
    const match = rootSection.match(/--muted-foreground:\s*oklch\(([\d.]+)/)
    expect(match).not.toBeNull()
    const lightness = parseFloat(match![1])
    expect(lightness).toBeLessThan(0.45)
  })

  test('layout.tsx uses Inter font', () => {
    expect(layoutTsx).toMatch(/Inter/)
  })

  test('layout.tsx does not use Geist font', () => {
    expect(layoutTsx).not.toMatch(/Geist/)
  })
})
