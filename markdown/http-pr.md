# Effect stuff
- wtf is a fibre https://youtu.be/S0umEpJrERc

## HTTP in effect
- I could go with the usual Node server design patterns I've grown used to, but I'm trying to find **the Effect way** to do it
- also want to model an intuitive api, that's where effort is right now..
- [generic batching & retries](https://gist.github.com/mikearnaldi/4a13fe6f51b28ad0b07fd7bbe3f4c49a) - some examples by Michael, could be helpful. **update: it was helpful!**
- can also continue to scour the discord for any http resources
- check out `Effect/io/Request`
- For learning async stuff, [this crash course](https://github.com/pigoz/effect-crashcourse) has some handy stuff too.
- introduced myself to [Effect schema](https://github.com/Effect-TS/schema)

# Notes
  - remember to test for expected behaviour/outcome, and not the implementation. By this logic, there's no need to adapt my testing to effectful ways.
- [x] pay a bit more attention to schema & types in general, and what's returned by `http.get`
  - Played with Schema a bit, also implemented some assertion. For now, I decided to do this on the consumer's side
