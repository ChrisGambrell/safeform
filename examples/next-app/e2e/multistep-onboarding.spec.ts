import { test, expect } from '@playwright/test'

test.describe('Onboarding — unnamed multi-step (E-6 through E-9)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding')
  })

  // E-6: next() advances step only when current step valid
  test('E-6: next advances when step 0 is valid', async ({ page }) => {
    await expect(page.getByTestId('step-indicator')).toContainText('Step 1 of 2')

    await page.getByTestId('username-input').fill('alice')
    await page.getByTestId('next-btn').click()

    await expect(page.getByTestId('step-indicator')).toContainText('Step 2 of 2')
    await expect(page.getByTestId('bio-input')).toBeVisible()
  })

  // E-7: next() shows errors on current step when invalid
  test('E-7: next shows errors when step 0 is invalid', async ({ page }) => {
    // Leave username empty — click next without filling
    await page.getByTestId('next-btn').click()

    // Should still be on step 1, with error visible
    await expect(page.getByTestId('step-indicator')).toContainText('Step 1 of 2')
    await expect(page.getByTestId('username-error')).toBeVisible()
  })

  // E-7b: too-short username shows specific message
  test('E-7b: short username shows min-length error', async ({ page }) => {
    await page.getByTestId('username-input').fill('x')
    await page.getByTestId('next-btn').click()

    await expect(page.getByTestId('username-error')).toContainText('2 characters')
  })

  // E-8: prev() goes back without clearing step 2 data
  test('E-8: prev returns to step 1 and next re-advances', async ({ page }) => {
    await page.getByTestId('username-input').fill('alice')
    await page.getByTestId('next-btn').click()
    await expect(page.getByTestId('step-indicator')).toContainText('Step 2 of 2')

    await page.getByTestId('prev-btn').click()
    await expect(page.getByTestId('step-indicator')).toContainText('Step 1 of 2')
    await expect(page.getByTestId('username-input')).toBeVisible()
  })

  // E-9: final step submit sends all accumulated data
  test('E-9: full multi-step submit shows success', async ({ page }) => {
    // Step 1
    await page.getByTestId('username-input').fill('alice')
    await page.getByTestId('next-btn').click()
    await expect(page.getByTestId('step-indicator')).toContainText('Step 2 of 2')

    // Step 2
    await page.getByTestId('bio-input').fill('I am a software engineer who loves building things.')
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('success-message')).toBeVisible()
    await expect(page.getByTestId('success-message')).toContainText('Welcome!')
  })
})
