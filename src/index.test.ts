import { test, expect } from "vitest";
import yo from './index'

test('mic check', () => {
  expect(yo).toEqual(10)
})
