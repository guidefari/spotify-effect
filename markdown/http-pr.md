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

# Todo
- [ ] Fix pipeline
- [ ] interface refactor in `http.test.ts`, move the effect code out of tests.
- [ ] Find some examples of unit tests in an effect codebase. anything different about how they're structured?
- [ ] pay a bit more attention to schema & types in general, and what's returned by `http.get`