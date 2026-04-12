import { test, expect } from '@playwright/test'

test.describe('FormArray — tag editor (E-12)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tags')
  })

  // E-12: append, fill, remove, submit — correct data sent
  test('E-12: append items, fill them, remove one, submit', async ({ page }) => {
    await page.getByTestId('title-input').fill('My Post')

    // Add three tags
    await page.getByTestId('add-tag-btn').click()
    await page.getByTestId('add-tag-btn').click()
    await page.getByTestId('add-tag-btn').click()

    await expect(page.getByTestId('tag-input-0')).toBeVisible()
    await expect(page.getByTestId('tag-input-1')).toBeVisible()
    await expect(page.getByTestId('tag-input-2')).toBeVisible()

    // Fill all three
    await page.getByTestId('tag-input-0').fill('react')
    await page.getByTestId('tag-input-1').fill('typescript')
    await page.getByTestId('tag-input-2').fill('zod')

    // Remove the second tag (typescript)
    await page.getByTestId('remove-tag-1').click()

    // Should have two tags left
    await expect(page.getByTestId('tag-input-0')).toBeVisible()
    await expect(page.getByTestId('tag-input-1')).toBeVisible()
    await expect(page.getByTestId('tag-input-2')).not.toBeVisible()

    // Submit
    await page.getByTestId('submit-btn').click()

    await expect(page.getByTestId('success-message')).toBeVisible()
    await expect(page.getByTestId('success-message')).toContainText('react')
    await expect(page.getByTestId('success-message')).toContainText('zod')
  })

  test('starts with no tag inputs', async ({ page }) => {
    await expect(page.getByTestId('tag-input-0')).not.toBeVisible()
  })

  test('add tag btn appends inputs one at a time', async ({ page }) => {
    await page.getByTestId('add-tag-btn').click()
    await expect(page.getByTestId('tag-input-0')).toBeVisible()

    await page.getByTestId('add-tag-btn').click()
    await expect(page.getByTestId('tag-input-1')).toBeVisible()
  })

  test('empty submit without tags shows validation error', async ({ page }) => {
    await page.getByTestId('title-input').fill('My Post')
    // Don't add any tags
    await page.getByTestId('submit-btn').click()

    // No success shown
    await expect(page.getByTestId('success-message')).not.toBeVisible()
  })
})
