import { test, expect } from "vitest";
import * as http from "./http";
import * as Effect from "@effect/io/Effect";
import * as Schema from "@effect/schema/Schema";

const TodoSchema = Schema.struct({
  userId: Schema.number,
  id: Schema.number,
  title: Schema.string,
  completed: Schema.boolean,
});
type TodoItem = Schema.To<typeof TodoSchema>;

test("http get request returns valid TODO item", async () => {
  const Todo1 = await Effect.runPromise(
    http.get<TodoItem>("https://jsonplaceholder.typicode.com/todos/1")
  );
  const valid = Schema.is(TodoSchema);
  expect(valid(Todo1)).toBeTruthy();
});
