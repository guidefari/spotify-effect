import { test, expect } from "vitest";
import * as http from "./http";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

const TodoSchema = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
});
type TodoItem = typeof TodoSchema.Type;

test("http get request returns valid TODO item", async () => {
  const Todo1 = await Effect.runPromise(
    http.get<TodoItem>("https://jsonplaceholder.typicode.com/todos/1")
  );
  const valid = Schema.is(TodoSchema);
  expect(valid(Todo1)).toBeTruthy();
});
