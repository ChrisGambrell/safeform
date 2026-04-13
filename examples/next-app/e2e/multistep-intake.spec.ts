import { test, expect } from '@playwright/test'

test.describe('Patient intake — named multi-step (E-10)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/intake')
  })

  // E-10: Named multi-step — data arrives namespaced at server
  test('E-10: full named multi-step submit shows success', async ({ page }) => {
    // Step 1 — personal
    await expect(page.getByTestId('step-indicator')).toContainText('Step 1 of 2')
    await page.getByTestId('firstName-input').fill('Jane')
    await page.getByTestId('dob-input').fill('01/15/1990')
    await page.getByTestId('phone-input').fill('(555) 123-4567')
    await page.getByTestId('next-btn').click()

    // Step 2 — vitals
    await expect(page.getByTestId('step-indicator')).toContainText('Step 2 of 2')
    await page.getByTestId('weight-input').fill('145')
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('success-message')).toBeVisible()
    await expect(page.getByTestId('success-message')).toContainText('Patient ID')
  })

  test('next() blocks on invalid step 1', async ({ page }) => {
    // Don't fill any fields, try to advance
    await page.getByTestId('next-btn').click()
    await expect(page.getByTestId('step-indicator')).toContainText('Step 1 of 2')
    await expect(page.getByTestId('firstName-error')).toBeVisible()
  })

  test('prev() returns to step 1 from step 2', async ({ page }) => {
    await page.getByTestId('firstName-input').fill('Jane')
    await page.getByTestId('dob-input').fill('01/15/1990')
    await page.getByTestId('phone-input').fill('(555) 123-4567')
    await page.getByTestId('next-btn').click()
    await expect(page.getByTestId('step-indicator')).toContainText('Step 2 of 2')

    await page.getByTestId('prev-btn').click()
    await expect(page.getByTestId('step-indicator')).toContainText('Step 1 of 2')
  })
})
