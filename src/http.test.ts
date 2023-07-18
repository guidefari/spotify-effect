import { test, expect } from "vitest";
import * as http from './http'
import * as Effect from "@effect/io/Effect"
import { identity, pipe } from "@effect/data/Function"

type TodoItem = {
  
}

test('http get request returns valid JSON', async () => { 
  const Todo1 = await Effect.runPromise(http.get<TodoItem>('https://jsonplaceholder.typicode.com/todos/1a'))
  console.log('Todo1:', Todo1)
 })