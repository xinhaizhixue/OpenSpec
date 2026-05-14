import { test, expect } from '@playwright/test';

const baseUrl = process.env.OPENSPEC_BASE_URL ?? 'http://127.0.0.1:3210';

function todoItem(page: import('@playwright/test').Page, title: string) {
  return page.locator('[data-testid="todo-item"]').filter({ has: page.getByText(title, { exact: true }) }).first();
}

test('REQ-TODO-001 Add a todo item', async ({ page }) => {
  await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'networkidle' });
  await page.getByTestId('new-todo-input').fill('Buy milk');
  await page.getByTestId('add-todo-button').click();
  await expect(todoItem(page, 'Buy milk')).toBeVisible();
});

test('REQ-TODO-002 Complete a todo item', async ({ page }) => {
  await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'networkidle' });
  await page.getByTestId('new-todo-input').fill('Buy milk');
  await page.getByTestId('add-todo-button').click();
  await todoItem(page, 'Buy milk').getByRole('checkbox').click();
  await expect(todoItem(page, 'Buy milk')).toHaveAttribute('data-completed', 'true');
});

test('REQ-TODO-003 Delete a todo item', async ({ page }) => {
  await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'networkidle' });
  await page.getByTestId('new-todo-input').fill('Buy milk');
  await page.getByTestId('add-todo-button').click();
  await todoItem(page, 'Buy milk').getByRole('button', { name: /delete/i }).click();
  await expect(todoItem(page, 'Buy milk')).toHaveCount(0);
});
