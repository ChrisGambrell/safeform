import { test, expect } from '@playwright/test'

test.describe('Contact form — public action', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact')
  })

  test('valid submission shows success with email', async ({ page }) => {
    await page.getByTestId('email-input').fill('hello@example.com')
    await page.getByTestId('message-input').fill('This is a test message that is long enough.')
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('success-message')).toBeVisible()
    await expect(page.getByTestId('success-message')).toContainText('hello@example.com')
  })

  test('empty submit shows field errors', async ({ page }) => {
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('email-error')).toBeVisible()
    await expect(page.getByTestId('message-error')).toBeVisible()
  })

  test('short message shows message error', async ({ page }) => {
    await page.getByTestId('email-input').fill('x@y.com')
    await page.getByTestId('message-input').fill('too short')
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('message-error')).toBeVisible()
    await expect(page.getByTestId('message-error')).toContainText('10 characters')
  })

  test('invalid email shows email error', async ({ page }) => {
    await page.getByTestId('email-input').fill('not-an-email')
    await page.getByTestId('message-input').fill('This is a valid length message body here.')
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('email-error')).toBeVisible()
    await expect(page.getByTestId('email-error')).toContainText('Invalid email')
  })
})
