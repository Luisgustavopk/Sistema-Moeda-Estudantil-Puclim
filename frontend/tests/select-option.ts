import type { Locator } from '@playwright/test'
export async function chooseOption(
  trigger: Locator,
  value: string | { label: string },
) {
  await trigger.click()
  const options = trigger.page().getByRole('option')
  if (typeof value === 'string')
    await options
      .and(trigger.page().locator(`[data-value=${JSON.stringify(value)}]`))
      .click()
  else
    await trigger
      .page()
      .getByRole('option', { name: value.label, exact: true })
      .click()
}
