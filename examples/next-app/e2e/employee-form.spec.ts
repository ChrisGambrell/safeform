import { test, expect } from '@playwright/test'

test.describe('Employee form — E-1 through E-5', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/employee')
  })

  // E-1: Fill all fields, submit, assert success state
  test('E-1: valid submission shows success message', async ({ page }) => {
    await page.getByTestId('name-input').fill('Alice Smith')
    await page.getByTestId('role-select').selectOption('Admin')
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('success-message')).toBeVisible()
    await expect(page.getByTestId('success-message')).toContainText('Employee saved!')
  })

  // E-2: Submit empty — assert field errors display inline
  test('E-2: empty submit shows inline field errors', async ({ page }) => {
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('name-error')).toBeVisible()
    await expect(page.getByTestId('name-error')).toContainText(/required/i)
  })

  // E-3: Server-returned field error appears on the correct field
  test('E-3: server field error appears on the correct field', async ({ page }) => {
    // 'duplicate' is in TAKEN_NAMES — triggers a server-side fieldError
    await page.getByTestId('name-input').fill('duplicate')
    await page.getByTestId('role-select').selectOption('Cashier')
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('name-error')).toBeVisible()
    await expect(page.getByTestId('name-error')).toContainText('already in use')
  })

  // E-4: Role field error shows when role is not selected
  test('E-4: missing role shows role field error', async ({ page }) => {
    await page.getByTestId('name-input').fill('Bob Jones')
    // Leave role unselected
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('role-error')).toBeVisible()
  })

  // E-5: isPending disables submit button during fetch
  test('E-5: submit button is disabled while request is in flight', async ({ page }) => {
    // Intercept the API to add a delay
    await page.route('/api/employees', async (route) => {
      await page.waitForTimeout(200)
      await route.continue()
    })

    await page.getByTestId('name-input').fill('Charlie Brown')
    await page.getByTestId('role-select').selectOption('Janitor')

    const btn = page.getByTestId('submit-btn')
    await btn.click()

    // Button should be disabled immediately after click
    await expect(btn).toBeDisabled()

    // Wait for the response
    await expect(page.getByTestId('success-message')).toBeVisible()

    // Button should be re-enabled after success
    await expect(btn).toBeEnabled()
  })
})
