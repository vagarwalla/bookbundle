import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '../../..')
const editionPickerTsx = readFileSync(join(root, 'src/components/EditionPicker.tsx'), 'utf8')
const homepageTsx = readFileSync(join(root, 'src/app/page.tsx'), 'utf8')

describe('Mobile/iPhone experience', () => {
  test('EditionPicker grid uses grid-cols-2 on mobile', () => {
    expect(editionPickerTsx).toContain('grid-cols-2')
  })

  test('EditionPicker DialogContent has mobile full-screen sizing class h-[100dvh]', () => {
    expect(editionPickerTsx).toMatch(/h-\[100dvh\]/)
  })

  test('Start a Stack button has mobile-aware responsive classes', () => {
    // Hero button is hidden on mobile (hidden sm:inline-flex),
    // and a mobile-only button is shown after cards (sm:hidden)
    const hasHiddenSm = homepageTsx.includes('hidden sm:inline-flex')
    const hasSmHidden = homepageTsx.includes('sm:hidden')
    expect(hasHiddenSm || hasSmHidden).toBe(true)
  })
})
